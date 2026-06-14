import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Calendar, Clock, MapPin, Zap, TrendingUp } from 'lucide-react';

interface WorldCupShareCardProps {
  match: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeFlag: string;
    awayFlag: string;
    homeScore: number;
    awayScore: number;
    status: 'LIVE' | 'FT' | 'UPCOMING';
    minute?: string;
    group: string;
    date: string;
    time: string;
    venue?: string;
  };
}

export default function WorldCupShareCard({ match }: WorldCupShareCardProps) {
  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FT';
  
  const winner = match.homeScore > match.awayScore ? 'home' : match.awayScore > match.homeScore ? 'away' : 'draw';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 relative overflow-hidden rounded-[2rem] bg-slate-950 border border-white/10 shadow-2xl group"
    >
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full" />
      </div>

      {/* Stadium Light Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-px bg-gradient-to-r from-transparent via-sky-400/30 to-transparent" />

      <div className="relative z-10 p-8 sm:p-10">
        {/* Header Metadata */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
          <div className="flex items-center space-x-3 bg-white/5 py-1.5 px-4 rounded-full border border-white/5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
              World Cup • {match.group}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {isLive ? (
              <div className="flex items-center space-x-2 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  AO VIVO • {match.minute}'
                </span>
              </div>
            ) : isFinished ? (
              <div className="bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  Encerrado
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-sky-500/20 px-3 py-1.5 rounded-full border border-sky-500/20 text-sky-400">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {match.time} • {match.date}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* The Duel */}
        <div className="flex items-center justify-between gap-4 lg:gap-8 mb-12">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: -5 }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl mb-4 shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-3xl" />
              {match.homeFlag}
              {isFinished && winner === 'home' && (
                <div className="absolute -top-3 -left-3">
                  <TrendingUp className="w-6 h-6 text-emerald-500 bg-slate-900 rounded-full p-1 border border-emerald-500/20 shadow-lg" />
                </div>
              )}
            </motion.div>
            <h3 className="text-white font-black text-lg tracking-tight truncate w-full text-center">
              {match.homeTeam}
            </h3>
            {isFinished && winner === 'home' && (
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Vencedor</span>
            )}
          </div>

          {/* Score Core */}
          <div className="flex flex-col items-center">
            <div className="flex items-baseline space-x-4">
              <span className={`text-6xl sm:text-7xl font-black tracking-tighter tabular-nums ${winner === 'home' ? 'text-white' : 'text-white/40'}`}>
                {match.status === 'UPCOMING' ? '-' : match.homeScore}
              </span>
              <span className="text-white/10 font-thin text-4xl">:</span>
              <span className={`text-6xl sm:text-7xl font-black tracking-tighter tabular-nums ${winner === 'away' ? 'text-white' : 'text-white/40'}`}>
                {match.status === 'UPCOMING' ? '-' : match.awayScore}
              </span>
            </div>
            
            {isLive && (
              <motion.div 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-4 px-4 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              >
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Match Sync</span>
              </motion.div>
            )}
            
            {!isLive && !isFinished && (
               <div className="mt-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">VS</div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <motion.div 
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl mb-4 shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-3xl" />
              {match.awayFlag}
              {isFinished && winner === 'away' && (
                <div className="absolute -top-3 -right-3">
                  <TrendingUp className="w-6 h-6 text-emerald-500 bg-slate-900 rounded-full p-1 border border-emerald-500/20 shadow-lg" />
                </div>
              )}
            </motion.div>
            <h3 className="text-white font-black text-lg tracking-tight truncate w-full text-center">
              {match.awayTeam}
            </h3>
            {isFinished && winner === 'away' && (
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Vencedor</span>
            )}
          </div>
        </div>

        {/* Footer Info / Ranking Context */}
        <div className="flex items-center justify-center space-x-6 pt-10 border-t border-white/5">
           <div className="flex items-center space-x-2">
             <Zap className="w-3 h-3 text-amber-500" />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Aba de Esportes</span>
           </div>
           <div className="w-1 h-1 rounded-full bg-white/10" />
           <div className="flex items-center space-x-2">
             <MapPin className="w-3 h-3 text-white/40" />
             <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{match.venue || 'Mundial 2026'}</span>
           </div>
        </div>
      </div>

      {/* Glass Overlay Light Shine */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
    </motion.div>
  );
}
