import React from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, Info } from 'lucide-react';

interface WorldCupStandingsCardProps {
  group: {
    name: string;
    teams: Array<{
      name: string;
      p: number;
      j: number;
      v: number;
      e: number;
      d: number;
      gp: number;
      gc: number;
    }>;
  };
}

export default function WorldCupStandingsCard({ group }: WorldCupStandingsCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-4 bg-white dark:bg-slate-950 rounded-[2.5rem] border border-black/[0.03] dark:border-white/[0.1] shadow-xl overflow-hidden group"
    >
      <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900 border-b border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-black shadow-lg">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="font-black text-sm tracking-tight uppercase tracking-[0.1em]">{group.name} - Classificação</span>
        </div>
        <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
      </div>

      <div className="p-6 sm:p-8">
        <table className="w-full text-left border-separate border-spacing-y-3">
          <thead>
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] opacity-60">
              <th className="px-4 pb-2">Seleção</th>
              <th className="px-2 pb-2 text-center">PTS</th>
              <th className="px-2 pb-2 text-center">SG</th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, idx) => (
              <tr key={team.name} className="group/row">
                <td className="px-4 py-4 bg-slate-50 dark:bg-white/5 border border-black/[0.02] dark:border-white/[0.02] rounded-l-2xl">
                  <div className="flex items-center space-x-4">
                    <span className={`text-[10px] font-black ${idx < 2 ? 'text-emerald-500' : 'text-gray-400/50'}`}>
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </span>
                    <span className="text-sm font-black tracking-tight">{team.name}</span>
                    {idx < 2 && (
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    )}
                  </div>
                </td>
                <td className="px-2 py-4 bg-slate-50 dark:bg-white/5 border-y border-black/[0.02] dark:border-white/[0.02] text-center font-black text-sm tabular-nums">
                  {team.p}
                </td>
                <td className="px-4 py-4 bg-slate-50 dark:bg-white/5 border border-black/[0.02] dark:border-white/[0.02] rounded-r-2xl text-center font-black text-xs text-gray-400 tabular-nums">
                  {team.gp - (team.gc || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-6 border-t border-black/[0.03] dark:border-white/[0.05] flex items-center justify-center space-x-2">
            <Info className="w-3 h-3 text-gray-300" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">
              Os 2 melhores avançam para as oitavas de final
            </p>
        </div>
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
    </motion.div>
  );
}
