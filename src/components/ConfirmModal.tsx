import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar',
  type = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-2xl mb-4 ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">{message}</p>
              
              <div className="flex flex-col w-full space-y-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                    onClose();
                  }}
                  className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${
                    type === 'danger' 
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20' 
                      : 'bg-black text-white hover:bg-gray-900 shadow-lg shadow-black/10'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="w-full py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all active:scale-95"
                >
                  {cancelText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
