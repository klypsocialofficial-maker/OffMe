import React, { useState, useEffect } from 'react';
import { Target, Trophy, Star, ChevronRight, Zap, CheckCircle2, Flame, Award, Swords } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, onSnapshot, getDocs, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import LazyImage from '../components/LazyImage';
import Toast from '../components/Toast';

export default function Missions() {
  const { userProfile } = useAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(0);

  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    if (!db) return;

    setLoading(true);
    // Fetch the missions configuration from DB
    const q = query(collection(db, 'missions'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => {
        const data = doc.data();
        const isCompleted = userProfile?.completedMissionIds?.includes(doc.id);
        
        let progress = 0;
        if (isCompleted) {
          progress = data.requirement;
        } else {
          // Compute rough progress based on points just so the bar has some value if they did some actions
          // Normally we'd track each mission individually, but for real-time we'll approximate based on points
          if (data.type === 'like' || data.type === 'reply') {
             progress = Math.min((userProfile?.points || 0), data.requirement);
          } else {
             progress = 0; // if it's a specific goal, we leave it at 0
          }
        }

        return { 
          id: doc.id, 
          ...data,
          isCompleted,
          progress
        };
      });
      setMissions(results);
      setCompletedToday(results.filter(m => m.isCompleted).length);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile?.uid, db]);

  const getLevelInfo = (points: number = 0) => {
    const level = Math.floor(Math.sqrt(points / 100)) + 1;
    const currentLevelExp = points - (Math.pow(level - 1, 2) * 100);
    const nextLevelTotalExp = (Math.pow(level, 2) * 100) - (Math.pow(level - 1, 2) * 100);
    const progress = (currentLevelExp / nextLevelTotalExp) * 100;
    
    return { level, progress, currentLevelExp, nextLevelTotalExp };
  };

  const { level, progress, currentLevelExp, nextLevelTotalExp } = getLevelInfo(userProfile?.points || 0);

  return (
    <div className="w-full min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-black/5 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-6 py-4">
          <h1 className="text-2xl font-black mb-1 italic tracking-tighter">Missões Diárias</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Complete desafios e suba de nível</p>
        </div>
      </div>

      <div className="p-4 sm:p-6 pb-24 space-y-6">
        {/* Profile Card / Level Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Trophy className="w-32 h-32 rotate-12" />
          </div>

          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-3xl bg-black flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-black/20">
              {level}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{userProfile?.displayName}</h2>
              <div className="flex items-center space-x-2 text-amber-500 font-bold text-sm">
                <Star className="w-4 h-4 fill-current" />
                <span>Nível {level} Especialista</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso do Nível</span>
              <span className="text-xs font-bold text-black">{Math.floor(currentLevelExp)} / {nextLevelTotalExp} XP</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden border border-black/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-2">
              <Flame className="w-6 h-6" />
            </div>
            <p className="text-2xl font-black">7 dias</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ofensiva</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-black/5 shadow-sm flex flex-col items-center text-center">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-2">
              <Swords className="w-6 h-6" />
            </div>
            <p className="text-2xl font-black">{completedToday}/{missions.length}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Concluídas Hoje</p>
          </div>
        </div>

        {/* Missions List */}
        <div className="space-y-4">
          <h3 className="text-lg font-black tracking-tight flex items-center space-x-2 px-2">
            <Target className="w-5 h-5 text-red-500" />
            <span>Desafios de Hoje</span>
          </h3>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" />
              </div>
            ) : missions.length > 0 ? (
              missions.map((mission, index) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-5 rounded-[28px] border transition-all ${
                    mission.isCompleted 
                    ? 'bg-green-50 border-green-100' 
                    : 'bg-white border-black/5 shadow-sm hover:border-black/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2.5 rounded-2xl ${
                        mission.isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {mission.type === 'post' && <Zap className="w-5 h-5 flex-shrink-0" />}
                        {mission.type === 'like' && <Heart className="w-5 h-5 flex-shrink-0" />}
                        {mission.type === 'reply' && <MessageCircle className="w-5 h-5 flex-shrink-0" />}
                        {!['post', 'like', 'reply'].includes(mission.type) && <Target className="w-5 h-5 flex-shrink-0" />}
                      </div>
                      <div>
                        <h4 className={`font-bold transition-colors ${mission.isCompleted ? 'text-green-700' : 'text-gray-900'}`}>
                          {mission.title}
                        </h4>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <Star className="w-3 h-3 text-amber-500 fill-current" />
                          <span className="text-[10px] font-black uppercase text-amber-600">+{mission.reward} XP</span>
                        </div>
                      </div>
                    </div>
                    {mission.isCompleted && (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    )}
                  </div>

                  {!mission.isCompleted && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                        <span className="text-gray-400">Progresso</span>
                        <span className="text-black">{mission.progress} / {mission.requirement}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-black/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(mission.progress / mission.requirement) * 100}%` }}
                          className="h-full bg-black rounded-full"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="p-12 bg-white rounded-3xl border border-dashed border-black/10 text-center">
                <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Sem missões para hoje!</p>
                <p className="text-xs text-gray-400">Volte amanhã para novos desafios.</p>
              </div>
            )}
          </div>
        </div>

        {/* Rewards / Badges Section */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
           <Award className="absolute -bottom-4 -right-4 w-32 h-32 opacity-20 rotate-12" />
           <h3 className="text-lg font-black tracking-tight mb-4">Suas Conquistas</h3>
           <div className="flex space-x-4 overflow-x-auto no-scrollbar pb-2">
             {(!userProfile?.badges || userProfile.badges.length === 0) ? (
                <div className="text-white/60 text-sm font-medium">Continue engajando para desbloquear conquistas exclusivas!</div>
             ) : userProfile.badges.map((badge: string) => (
               <div key={badge} className="flex-shrink-0 flex flex-col items-center space-y-2">
                 <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                    {badge === 'super_engaged' && <Flame className="w-8 h-8 text-orange-400" />}
                    {badge === 'top_creator' && <Star className="w-8 h-8 text-amber-300" />}
                    {badge === 'influencer' && <Trophy className="w-8 h-8 text-blue-300" />}
                 </div>
                 <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest text-center px-1">
                   {badge === 'super_engaged' && 'Super Engajado'}
                   {badge === 'top_creator' && 'Top Criador'}
                   {badge === 'influencer' && 'Influencer'}
                 </span>
               </div>
             ))}
           </div>
        </div>
      </div>

      <Toast 
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// Icons needed but not imported
import { MessageCircle, Heart } from 'lucide-react';
