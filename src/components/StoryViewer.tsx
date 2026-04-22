import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import LazyImage from './LazyImage';

interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  mediaUrl: string;
  type: 'image' | 'video';
}

interface StoryViewerProps {
  story: Story | null;
  onClose: () => void;
}

export default function StoryViewer({ story, onClose }: StoryViewerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          onClose();
          return 100;
        }
        return p + 0.5; // Ajuste pra velocidade do story
      });
    }, 50);

    return () => clearInterval(timer);
  }, [story, onClose]);

  if (!story) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      >
        {/* Barra de Progresso */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
           <div className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-white"
               style={{ width: `${progress}%` }}
             />
           </div>
        </div>

        {/* Informações do Autor e Fechar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center space-x-3">
             <img src={story.authorPhoto} alt={story.authorName} className="w-9 h-9 rounded-full border-2 border-white/20" />
             <span className="text-white font-bold text-sm tracking-tight">{story.authorName}</span>
          </div>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <LazyImage src={story.mediaUrl} alt="Story" className="w-full h-full object-contain" />
      </motion.div>
    </AnimatePresence>
  );
}
