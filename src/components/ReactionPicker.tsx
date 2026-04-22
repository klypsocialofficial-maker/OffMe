import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, CheckCircle2, Laugh, Zap, Star, Flame, Rocket, Ghost, PartyPopper } from 'lucide-react';

export const REACTION_TYPES = [
  { id: 'heart', icon: Heart, color: 'text-red-500', bg: 'bg-red-50', label: 'Amei' },
  { id: 'flame', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Fogo' },
  { id: 'rocket', icon: Rocket, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Foguete' },
  { id: 'funny', icon: Laugh, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Engraçado' },
  { id: 'party', icon: PartyPopper, color: 'text-pink-500', bg: 'bg-pink-50', label: 'Festa' },
  { id: 'ghost', icon: Ghost, color: 'text-slate-400', bg: 'bg-slate-50', label: 'Vixe' },
  { id: 'correct', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Correto' },
];

interface ReactionPickerProps {
  onSelect: (id: string) => void;
}

export default function ReactionPicker({ onSelect }: ReactionPickerProps) {
  const handleSelect = (id: string) => {
    // Haptic feedback for PWA
    if ('vibrate' in navigator) {
      navigator.vibrate(40);
    }
    onSelect(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: 15, scale: 0.9, filter: 'blur(10px)' }}
      className="absolute bottom-full mb-4 left-0 bg-white/95 dark:bg-slate-900/95 border border-black/5 dark:border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-2 flex items-center space-x-1 z-50 backdrop-blur-3xl"
    >
      {REACTION_TYPES.map((reaction, i) => {
        const Icon = reaction.icon;
        return (
          <motion.button
            key={reaction.id}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              delay: i * 0.03, 
              type: 'spring', 
              stiffness: 400, 
              damping: 15 
            }}
            whileHover={{ 
              scale: 1.4, 
              y: -10,
              transition: { type: 'spring', stiffness: 400, damping: 10 }
            }}
            whileTap={{ scale: 0.8 }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect(reaction.id);
            }}
            style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', userSelect: 'none' }}
            className={`p-3 rounded-2xl ${reaction.bg} dark:bg-white/5 transition-all relative group`}
          >
            <Icon className={`w-6 h-6 ${reaction.color} drop-shadow-md`} />
            
            {/* Tooltip */}
            <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 pointer-events-none shadow-xl border border-white/10">
              {reaction.label}
            </span>
            
            {/* Hover Glow */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 blur-lg -z-10 transition-opacity ${reaction.bg.replace('bg-', 'bg-')}`} />
          </motion.button>
        );
      })}
    </motion.div>
  );
}
