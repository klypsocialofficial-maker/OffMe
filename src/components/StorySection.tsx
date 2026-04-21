import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Flame } from 'lucide-react';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';
import { motion, AnimatePresence } from 'motion/react';

interface Story {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto: string;
  imageUrl: string;
  createdAt: any;
  expiresAt: any;
}

export default function StorySection({ onAddStory }: { onAddStory: () => void }) {
  const { userProfile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    if (!db) return;
    
    // Fetch stories from the last 24 hours
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const q = query(
      collection(db, 'posts'),
      where('isStory', '==', true),
      where('createdAt', '>', Timestamp.fromDate(yesterday)),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      // Group by author to show one circle per author
      const uniqueAuthors: Record<string, Story> = {};
      results.forEach(s => {
        if (!uniqueAuthors[s.authorId]) {
          uniqueAuthors[s.authorId] = s;
        }
      });
      setStories(Object.values(uniqueAuthors));
    });

    return unsubscribe;
  }, []);

  return (
    <div className="flex items-center space-x-4 overflow-x-auto py-4 px-4 scrollbar-hide border-b border-gray-100 dark:border-white/5">
      {/* Create Story */}
      <div className="flex flex-col items-center space-y-1 flex-shrink-0">
        <button 
          onClick={onAddStory}
          className="relative w-16 h-16 rounded-3xl overflow-hidden border-2 border-gray-100 dark:border-white/10 p-0.5"
        >
          <div className="w-full h-full rounded-[20px] bg-gray-50 dark:bg-white/5 flex items-center justify-center">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Eu" className="w-full h-full object-cover opacity-50" />
            ) : (
              <img src={getDefaultAvatar(userProfile?.displayName || 'Eu', userProfile?.username || '')} alt="Eu" className="w-full h-full object-cover opacity-50" />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-blue-500 text-white p-1 rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
            </div>
          </div>
        </button>
        <span className="text-[10px] font-black italic text-gray-500">Seu Off</span>
      </div>

      {/* Stories List */}
      <AnimatePresence>
        {stories.map((story) => (
          <motion.div
            key={story.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-1 flex-shrink-0 cursor-pointer group"
          >
            <div className="relative w-16 h-16 rounded-3xl p-0.5 bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 group-hover:rotate-6 transition-transform">
              <div className="w-full h-full rounded-[22px] bg-white dark:bg-slate-950 p-0.5">
                <div className="w-full h-full rounded-[20px] overflow-hidden">
                  <LazyImage src={story.authorPhoto || getDefaultAvatar(story.authorName, story.authorUsername)} alt={story.authorName} className="w-full h-full object-cover" />
                </div>
              </div>
              {/* Optional: Indicator for special users */}
              {story.authorUsername === 'Rulio' && (
                <div className="absolute -top-1 -right-1 bg-amber-400 text-[8px] font-black text-white px-1.5 py-0.5 rounded-full border border-white shadow-sm">STAFF</div>
              )}
            </div>
            <span className="text-[10px] font-black italic text-gray-900 dark:text-white truncate w-16 text-center">
              {story.authorUsername}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
