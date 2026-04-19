import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageCircle, Send, MoreHorizontal, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { formatRelativeTime } from '../lib/dateUtils';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';

interface StoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  stories: any[];
  initialStoryIndex?: number;
}

export default function StoryViewer({ isOpen, onClose, stories, initialStoryIndex = 0 }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const currentStory = stories[currentIndex];
  const storyDuration = 5000; // 5 seconds per story
  const progressInterval = 50; // Update every 50ms
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialStoryIndex);
      startTimer();
    }
    return () => clearInterval(timerRef.current);
  }, [isOpen, initialStoryIndex]);

  useEffect(() => {
    if (isOpen && !isPaused) {
      startTimer();
    } else {
      clearInterval(timerRef.current);
    }
  }, [currentIndex, isPaused, isOpen]);

  const startTimer = () => {
    clearInterval(timerRef.current);
    setProgress(0);
    
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + (progressInterval / storyDuration) * 100;
      });
    }, progressInterval);
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else {
      setProgress(0);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const { clientX } = e;
    const { innerWidth } = window;
    if (clientX < innerWidth / 3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!isOpen || !currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 150) {
            onClose();
          }
        }}
        className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center overflow-hidden"
      >
        <div className="relative w-full max-w-lg h-full bg-neutral-900 overflow-hidden shadow-2xl flex flex-col">
          {/* Progress Bars */}
          <div className="absolute top-[env(safe-area-inset-top,0px)] pt-2 inset-x-0 p-2 flex space-x-1 z-20">
            {stories.map((_, idx) => (
              <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-[50ms] linear"
                  style={{ 
                    width: `${idx === currentIndex ? progress : (idx < currentIndex ? 100 : 0)}%` 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-[calc(env(safe-area-inset-top,0px)+12px)] inset-x-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/40 to-transparent">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                <LazyImage 
                  src={currentStory.authorPhoto || getDefaultAvatar(currentStory.authorName, currentStory.authorUsername)} 
                  className="w-full h-full" 
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1">
                   <span className="text-white font-bold text-sm">{currentStory.authorName}</span>
                   <span className="text-white/60 text-xs">@{currentStory.authorUsername}</span>
                </div>
                <span className="text-white/40 text-[10px]">{formatRelativeTime(currentStory.createdAt?.toDate())}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
                 <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-white hover:bg-white/10 rounded-full">
                   {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                 </button>
                 <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full">
                    <X className="w-6 h-6" />
                 </button>
            </div>
          </div>

          {/* Media Content */}
          <div 
            className="flex-1 relative cursor-pointer"
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onClick={handleTap}
          >
            {currentStory.mediaType === 'video' ? (
              <video 
                src={currentStory.imageUrls?.[0]} 
                autoPlay 
                playsInline 
                muted={isMuted}
                loop
                className={`w-full h-full object-cover`}
              />
            ) : (
              <img 
                src={currentStory.imageUrls?.[0]} 
                className={`w-full h-full object-cover`}
                alt="Story content"
              />
            )}
            
            {/* Story Text */}
            {currentStory.content && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center p-8 pointer-events-none">
                  <span className="text-white text-2xl font-bold text-center drop-shadow-lg break-words max-w-full italic px-4 py-2 bg-black/30 rounded-lg">
                    {currentStory.content}
                  </span>
                </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 flex items-center space-x-4 bg-gradient-to-t from-black/60 to-transparent z-20">
             <div className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white text-sm">
                Responder a {currentStory.authorName.split(' ')[0]}...
             </div>
             <button className="text-white hover:text-red-500 transition-colors">
                <Heart className="w-6 h-6" />
             </button>
             <button className="text-white hover:text-blue-500 transition-colors">
                <Send className="w-6 h-6" />
             </button>
          </div>

          {/* Navigation Hints (Desktop) */}
          <div className="hidden md:block">
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className={`absolute top-1/2 -left-16 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all ${currentIndex === 0 ? 'opacity-0 scale-50' : 'opacity-100'}`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute top-1/2 -right-16 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
