import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Zap, Star } from 'lucide-react';

interface GamerCardProps {
  level?: number;
  points?: number;
  displayName: string;
}

export default function GamerCard({ level = 1, points = 0, displayName }: GamerCardProps) {
  // Simple calculation for next level progress
  const pointsToNextLevel = (level * 200);
  const progress = Math.min(100, (points / pointsToNextLevel) * 100);

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="mt-6 p-4 rounded-3xl bg-gradient-to-br from-black to-gray-800 text-white relative overflow-hidden shadow-xl"
    >
      {/* Decorative background icons */}
      <Trophy className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
      <Zap className="absolute -top-4 -left-4 w-16 h-16 text-white/5 -rotate-12" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status de Membro</span>
            <h3 className="text-lg font-black">{displayName}</h3>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-black">Nível {level}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/20">
                <Zap className="w-4 h-4 text-black fill-black" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 leading-none">PONTOS TOTAIS</p>
                <p className="text-lg font-black">{points}</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-gray-400">PROX. NÍVEL: {pointsToNextLevel} PTS</p>
          </div>

          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
