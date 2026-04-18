import React, { useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { X, Download } from 'lucide-react';
import LazyImage from './LazyImage';

interface ImageViewerProps {
  src: string | null;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export default function ImageViewer({ src, isOpen, onClose, alt = "Visualização de imagem" }: ImageViewerProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0, 1, 0]);
  const scale = useTransform(y, [-200, 0, 200], [0.8, 1, 0.8]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!src) return null;

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.y) > 100 || Math.abs(info.velocity.y) > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-md cursor-zoom-out"
          />

          {/* Controls */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center space-x-4 pointer-events-auto"
            >
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl transition-all active:scale-90"
                title="Fechar"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>

            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="flex items-center space-x-3 pointer-events-auto"
            >
              <a
                href={src}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-xl transition-all active:scale-90"
                title="Baixar imagem"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="w-6 h-6" />
              </a>
            </motion.div>
          </div>

          {/* Image Container */}
          <motion.div
            style={{ y, opacity, scale }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-full max-h-full flex items-center justify-center z-0 pointer-events-auto cursor-grab active:cursor-grabbing"
          >
            <LazyImage
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
              referrerPolicy="no-referrer"
              draggable={false}
            />
          </motion.div>

          {/* Footer Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium pointer-events-none"
          >
            {alt}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
