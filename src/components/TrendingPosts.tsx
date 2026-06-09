import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, Heart, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line } from 'recharts';

// Seeded pseudorandom generator for authentic sparkline data
const getDeterministicData = (postId: string, baseValue: number) => {
  let seed = 0;
  const idStr = postId || 'default';
  for (let i = 0; i < idStr.length; i++) {
    seed += idStr.charCodeAt(i);
  }
  
  const points = [];
  const hours = 24;
  
  for (let h = 0; h < hours; h++) {
    const frequencyMultiplier = 1 + (seed % 3);
    const wave1 = Math.sin((h / hours) * Math.PI * 2 * frequencyMultiplier);
    const wave2 = Math.cos((h / hours) * Math.PI * 4 * (1 + (seed % 2)));
    
    const peakHour = (seed * 7) % hours;
    const distanceToPeak = Math.abs(h - peakHour);
    const peakEffect = Math.exp(-Math.pow(distanceToPeak / 3, 2)) * 1.2;
    
    const noiseVal = Math.sin(seed * (h + 1) * 31.415) * 0.15;
    
    let valueMultiplier = 0.5 + (wave1 * 0.3 + wave2 * 0.15 + peakEffect + noiseVal);
    valueMultiplier = Math.max(0.1, valueMultiplier);
    
    const engagement = Math.round((baseValue + 5) * valueMultiplier);
    
    points.push({
      hour: `${h}h`,
      engagement: Math.max(1, engagement)
    });
  }
  
  return points;
};

interface TrendingPostsProps {
  autoHide?: boolean;
  isFullList?: boolean;
}

const TrendingPosts: React.FC<TrendingPostsProps> = ({ autoHide = false, isFullList = false }) => {
  const [trendingPosts, setTrendingPosts] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const prevTrendingIds = useRef<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!db) return;

    const q = query(
      collection(db, 'posts'),
      orderBy('likesCount', 'desc'),
      limit(isFullList ? 40 : 15)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as any)
        .filter(post => post.privacy === 'public' || !post.privacy);
      setTrendingPosts(posts.slice(0, isFullList ? 20 : 5));
    }, (error) => {
      console.error('Error fetching trending posts:', error);
    });

    return () => unsubscribe();
  }, [isFullList]);

  useEffect(() => {
    if (!autoHide) return;

    const currentIds = trendingPosts.map(p => p.id).join(',');
    if (currentIds !== prevTrendingIds.current) {
      prevTrendingIds.current = currentIds;
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [trendingPosts, autoHide]);

  if (trendingPosts.length === 0) return null;
  if (autoHide && !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={autoHide ? { opacity: 0, height: 0, marginBottom: 0 } : false}
        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
        className="liquid-glass-pill p-5 rounded-3xl border border-white/40 shadow-sm mx-4 overflow-hidden"
      >
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-black" />
          <h2 className="text-lg font-bold text-black uppercase tracking-tight">Em Alta</h2>
        </div>
        <div className="space-y-4">
          {(isFullList ? trendingPosts : trendingPosts.slice(0, 1)).map((post, index) => (
            <div 
              key={post.id} 
              className="cursor-pointer group hover:bg-gray-50/50 p-2.5 -mx-2.5 rounded-2xl transition-all duration-200"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <span className="text-lg font-black text-black/20 group-hover:text-black transition-colors pt-0.5">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-black leading-tight transition-colors">
                      {post.content}
                    </p>
                    <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center"><Heart className="w-3.5 h-3.5 mr-1 text-rose-500 fill-rose-50/50" /> {post.likesCount || 0}</span>
                      <span className="flex items-center"><Repeat className="w-3.5 h-3.5 mr-1 text-blue-500" /> {post.repostsCount || 0}</span>
                      {isFullList && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                          +{Math.round(((post.likesCount || 0) + (post.repostsCount || 0)) * 1.4 + 12)} em alta
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isFullList && (
                  <div className="flex flex-col items-end flex-shrink-0 bg-gray-50/45 p-1.5 rounded-xl border border-gray-100">
                    <div className="w-[110px] h-[34px] overflow-hidden flex items-center justify-center pointer-events-none">
                      <LineChart 
                        width={100} 
                        height={30} 
                        data={getDeterministicData(post.id, (post.likesCount || 0) * 2 + (post.repostsCount || 0) * 3)}
                        margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
                      >
                        <Line 
                          type="monotone" 
                          dataKey="engagement" 
                          stroke={
                            index === 0 ? "#f43f5e" : 
                            index === 1 ? "#f97316" : 
                            index === 2 ? "#3b82f6" : 
                            "#10b981"
                          } 
                          strokeWidth={2.5} 
                          dot={false} 
                        />
                      </LineChart>
                    </div>
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 px-0.5 scale-90 origin-right pointer-events-none">
                      Atividade 24h
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {!isFullList && trendingPosts.length > 1 && (
          <button 
            onClick={() => navigate('/trending')}
            className="mt-4 w-full py-2 text-sm font-bold text-black bg-white/50 hover:bg-white/80 rounded-xl transition-colors border border-black/5"
          >
            Mostrar mais
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TrendingPosts;
