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
        <div className="absolute top-4 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-white"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Informações do Autor */}
        <div className="absolute top-8 left-4 flex items-center space-x-2 z-10">
          <img src={story.authorPhoto} alt={story.authorName} className="w-8 h-8 rounded-full border border-white/20" />
          <span className="text-white font-bold text-sm tracking-tight">{story.authorName}</span>
        </div>

        {/* Botão Fechar */}
        <button onClick={onClose} className="absolute top-8 right-4 text-white z-10 p-2">
          <X className="w-6 h-6" />
        </button>

        {/* Conteúdo */}
        <LazyImage src={story.mediaUrl} alt="Story" className="w-full h-full object-contain" />
      </motion.div>
    </AnimatePresence>
  );
}
