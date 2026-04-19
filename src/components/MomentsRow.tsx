import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, Ghost } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';

interface MomentsRowProps {
  userProfile: any;
  openCreateModal: (replyTo?: any, quotePost?: any, isAnonymous?: boolean) => void;
  openStoryCreator: () => void;
  openStoryViewer: (stories: any[], startIndex?: number) => void;
}

export default function MomentsRow({ 
  userProfile, 
  openCreateModal, 
  openStoryCreator, 
  openStoryViewer 
}: MomentsRowProps) {
  const [moments, setMoments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [allMomentsData, setAllMomentsData] = useState<any[]>([]);

  useEffect(() => {
    if (!db) return;

    const now = new Date();
    const q = query(
      collection(db, 'posts'),
      where('isMoment', '==', true),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setAllMomentsData(results);
      
      // Group by author to show one per user
      const uniqueAuthors = new Map();
      results.forEach(m => {
        if (!uniqueAuthors.has(m.authorId)) {
          uniqueAuthors.set(m.authorId, m);
        }
      });
      
      setMoments(Array.from(uniqueAuthors.values()));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching moments:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  return (
    <div className="w-full bg-white border-b border-black/5 py-4 overflow-hidden">
      <div className="flex px-4 items-center space-x-3 overflow-x-auto no-scrollbar pb-1">
        {/* Your Story Button */}
        <div className="flex flex-col items-center space-y-1.5 flex-shrink-0">
          <button 
            onClick={() => openStoryCreator()}
            className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 p-1 group active:scale-95 transition-all"
          >
            <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center relative overflow-hidden group-hover:bg-gray-100">
               {userProfile?.photoURL ? (
                 <LazyImage src={userProfile.photoURL} className="w-full h-full" />
               ) : (
                 <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} className="w-full h-full" />
               )}
               <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <Plus className="w-6 h-6 text-white" />
               </div>
               <div className="absolute bottom-1 right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                 <Plus className="w-3 h-3 text-white" />
               </div>
            </div>
          </button>
          <span className="text-[10px] font-bold text-gray-500">Seu Story</span>
        </div>

        {/* Other Moments */}
        {loading ? (
          <div className="flex space-x-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
             ))}
          </div>
        ) : (
          moments.map((moment, index) => (
            <motion.div 
              key={moment.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // Find all stories by this author
                const authorStories = allMomentsData.filter(m => m.authorId === moment.authorId);
                openStoryViewer(authorStories, 0);
              }}
              className="flex flex-col items-center space-y-1.5 flex-shrink-0 cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 shadow-lg shadow-pink-500/10 active:shadow-none transition-shadow">
                <div className="w-full h-full rounded-full bg-white p-0.5">
                  <div className={`w-full h-full rounded-full overflow-hidden ${moment.isAnonymous ? 'bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center' : ''}`}>
                    {moment.isAnonymous ? (
                      <Ghost className="w-8 h-8 text-indigo-300" />
                    ) : (
                      <LazyImage 
                        src={moment.authorPhoto || getDefaultAvatar(moment.authorName, moment.authorUsername)} 
                        className="w-full h-full" 
                      />
                    )}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] font-bold truncate w-16 text-center ${moment.isAnonymous ? 'text-indigo-500 italic' : 'text-black'}`}>
                {moment.isAnonymous ? 'Anônimo' : moment.authorName.split(' ')[0]}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
