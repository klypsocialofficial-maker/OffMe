import React from 'react';
import { BADGES } from '../constants/badges';
import { motion } from 'motion/react';

interface BadgeDisplayProps {
  badges?: string[];
}

export default function BadgeDisplay({ badges = [] }: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  const earnedBadges = BADGES.filter(b => badges.includes(b.id));

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {earnedBadges.map((badge) => (
        <motion.div
          key={badge.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center space-x-1 px-3 py-1 rounded-full bg-white border border-gray-100 shadow-sm group relative cursor-help transition-all hover:border-black/10 hover:shadow-md`}
        >
          <badge.icon className={`w-3.5 h-3.5 ${badge.color}`} />
          <span className="text-[11px] font-black uppercase tracking-wider text-black">{badge.label}</span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-black text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 shadow-xl">
             <div className="flex items-center space-x-2 mb-1">
                <badge.icon className={`w-4 h-4 ${badge.color}`} />
                <span className="font-black text-sm">{badge.label}</span>
             </div>
             <p className="text-[10px] text-gray-300 mb-2">{badge.description}</p>
             <div className="h-[1px] bg-white/10 mb-2" />
             <p className="text-[9px] font-medium text-gray-400">Requisito: {badge.requirement}</p>
             <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-black"></div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
