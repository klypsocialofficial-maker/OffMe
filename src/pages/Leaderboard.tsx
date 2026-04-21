import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, ArrowLeft, Zap, Flame, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import LazyImage from '../components/LazyImage';
import VerifiedBadge from '../components/VerifiedBadge';
import { getDefaultAvatar } from '../lib/avatar';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopUsers(users);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 amoled:bg-black">
      <div className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 amoled:bg-black/70 backdrop-blur-2xl border-b border-black/5 dark:border-white/10 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 py-4 flex items-center space-x-2">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors mr-1"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter leading-tight">Ranking de Fantasmas</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5">Os espíritos mais ativos do OffMe</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24 max-w-2xl mx-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-black/10 border-t-black dark:border-white/10 dark:border-t-white rounded-full animate-spin" />
            <p className="text-gray-500 font-bold animate-pulse">Invocando espíritos...</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="flex items-end justify-center pt-8 pb-4 space-x-4">
              {/* 2nd Place */}
              <div className="flex flex-col items-center">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative mb-2"
                  onClick={() => navigate(`/${topUsers[1]?.username}`)}
                >
                  <div className="w-20 h-20 rounded-full border-4 border-slate-300 overflow-hidden bg-gray-200">
                    <img src={topUsers[1]?.photoURL || getDefaultAvatar(topUsers[1]?.displayName, topUsers[1]?.username)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-slate-700 font-black shadow-lg">2</div>
                </motion.div>
                <p className="text-sm font-black truncate w-24 text-center">{topUsers[1]?.displayName}</p>
                <div className="h-24 w-16 bg-slate-200/50 dark:bg-slate-800/50 rounded-t-2xl mt-2 flex flex-col items-center justify-center">
                   <Medal className="w-8 h-8 text-slate-400" />
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center">
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative mb-2 scale-110"
                  onClick={() => navigate(`/${topUsers[0]?.username}`)}
                >
                  <div className="w-24 h-24 rounded-full border-4 border-amber-400 overflow-hidden bg-gray-200">
                    <img src={topUsers[0]?.photoURL || getDefaultAvatar(topUsers[0]?.displayName, topUsers[0]?.username)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-lg">
                    <Crown className="w-10 h-10 fill-current" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center text-amber-900 font-black shadow-lg">1</div>
                </motion.div>
                <p className="text-base font-black truncate w-28 text-center">{topUsers[0]?.displayName}</p>
                <div className="h-32 w-20 bg-amber-100/50 dark:bg-amber-900/20 rounded-t-2xl mt-2 flex flex-col items-center justify-center border-x border-t border-amber-200/50">
                   <Trophy className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center">
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.2 }}
                  className="relative mb-2"
                  onClick={() => navigate(`/${topUsers[2]?.username}`)}
                >
                  <div className="w-20 h-20 rounded-full border-4 border-amber-700/50 overflow-hidden bg-gray-200">
                    <img src={topUsers[2]?.photoURL || getDefaultAvatar(topUsers[2]?.displayName, topUsers[2]?.username)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-700/50 rounded-full flex items-center justify-center text-amber-900 font-black shadow-lg">3</div>
                </motion.div>
                <p className="text-sm font-black truncate w-24 text-center">{topUsers[2]?.displayName}</p>
                <div className="h-20 w-16 bg-amber-800/10 dark:bg-amber-900/10 rounded-t-2xl mt-2 flex flex-col items-center justify-center">
                   <Medal className="w-8 h-8 text-amber-700/60" />
                </div>
              </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 amoled:bg-zinc-900 rounded-[32px] overflow-hidden border border-black/5 dark:border-white/10 shadow-sm">
              {topUsers.slice(3).map((user, index) => (
                <motion.div 
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="p-4 flex items-center space-x-4 border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/${user.username}`)}
                >
                  <span className="w-6 text-gray-400 font-black italic text-sm">{index + 4}</span>
                  <div className="w-12 h-12 rounded-2xl bg-gray-200 overflow-hidden flex-shrink-0">
                    <img src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center space-x-1">
                      <p className="font-bold truncate text-sm">{user.displayName}</p>
                      {user.isVerified && <VerifiedBadge tier={user.premiumTier} />}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      <span>Nível {Math.floor(Math.sqrt((user.points || 0) / 100)) + 1}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Flame className="w-3 h-3 text-orange-500 mr-0.5" />
                        {user.streakCount || 0} Dias
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-blue-500">{user.points?.toLocaleString() || 0}</p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 leading-none">PONTOS</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
