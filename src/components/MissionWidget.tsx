import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Target, CheckCircle2, Trophy, ArrowRight } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface MissionWidgetProps {
  userId: string;
}

export default function MissionWidget({ userId }: MissionWidgetProps) {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) return;

    const q = query(
      collection(db, 'userMissions'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMissions(missionData.slice(0, 3));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  if (loading || missions.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative group">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
      
      <div className="flex items-center justify-between mb-4 relative">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="font-black italic uppercase tracking-tighter text-lg">Missões Diárias</h3>
        </div>
        <Trophy className="w-5 h-5 text-yellow-400" />
      </div>

      <div className="space-y-3 relative">
        {missions.map((mission) => {
          const progress = Math.min(100, (mission.currentProgress / mission.requirement) * 100);
          return (
            <div key={mission.id} className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/80">{mission.title}</span>
                <span className="text-[10px] font-bold">{mission.currentProgress}/{mission.requirement}</span>
              </div>
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className={`h-full ${progress === 100 ? 'bg-green-400' : 'bg-white'}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => navigate('/missions')}
        className="w-full mt-5 py-2.5 bg-white text-indigo-600 font-black italic uppercase tracking-tighter text-xs rounded-2xl flex items-center justify-center space-x-2 hover:bg-indigo-50 transition-colors"
      >
        <span>Ver Todas</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
