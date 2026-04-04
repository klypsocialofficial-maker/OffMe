import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', isOpen, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm"
        >
          <div className={`
            flex items-center justify-between p-4 rounded-2xl shadow-2xl border backdrop-blur-xl
            ${type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' : 
              type === 'success' ? 'bg-green-50/90 border-green-100 text-green-800' : 
              'bg-white/90 border-gray-100 text-gray-800'}
          `}>
            <div className="flex items-center space-x-3">
              {type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
              <p className="text-sm font-medium">{message}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
