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
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-full shadow-2xl p-1 flex items-center space-x-1 z-50 backdrop-blur-xl"
    >
      {REACTION_TYPES.map((reaction) => {
        const Icon = reaction.icon;
        return (
          <motion.button
            key={reaction.id}
            whileHover={{ scale: 1.3, y: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(reaction.id);
            }}
            className={`p-2 rounded-full ${reaction.bg} dark:bg-white/5 transition-colors relative group`}
          >
            <Icon className={`w-5 h-5 ${reaction.color}`} />
            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {reaction.label}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
