import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, Heart, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

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
      where('privacy', '==', 'public'),
      orderBy('likesCount', 'desc'),
      limit(isFullList ? 20 : 5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrendingPosts(posts);
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
              className="cursor-pointer group"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <div className="flex items-start space-x-3">
                <span className="text-xl font-black text-black/20 group-hover:text-black transition-colors">
                  #{index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-black transition-colors">
                    {post.content}
                  </p>
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center"><Heart className="w-3 h-3 mr-1" /> {post.likesCount || 0}</span>
                    <span className="flex items-center"><Repeat className="w-3 h-3 mr-1" /> {post.repostsCount || 0}</span>
                  </div>
                </div>
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
