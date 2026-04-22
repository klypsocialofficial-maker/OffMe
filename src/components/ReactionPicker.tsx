import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, CheckCircle2, Laugh, Zap, Star } from 'lucide-react';

export const REACTION_TYPES = [
  { id: 'heart', icon: Heart, color: 'text-red-500', bg: 'bg-red-50', label: 'Amei' },
  { id: 'correct', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Correto' },
  { id: 'funny', icon: Laugh, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Engraçado' },
  { id: 'zap', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Eletrizante' },
  { id: 'star', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Destaque' }
];

interface ReactionPickerProps {
  onSelect: (id: string) => void;
}

export default function ReactionPicker({ onSelect }: ReactionPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 15, scale: 0.9 }}
      className="absolute bottom-full mb-3 left-0 bg-white/90 dark:bg-slate-900/90 border border-black/5 dark:border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] p-1.5 flex items-center space-x-1.5 z-50 backdrop-blur-2xl"
    >
      {REACTION_TYPES.map((reaction, i) => {
        const Icon = reaction.icon;
        return (
          <motion.button
            key={reaction.id}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.3, y: -8 }}
            whileTap={{ scale: 0.85 }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(reaction.id);
            }}
            style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', userSelect: 'none' }}
            className={`p-2.5 rounded-xl ${reaction.bg} dark:bg-white/5 transition-all relative group shadow-sm`}
          >
            <Icon className={`w-5 h-5 ${reaction.color} drop-shadow-sm`} />
            <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none backdrop-blur-sm border border-white/10">
              {reaction.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
