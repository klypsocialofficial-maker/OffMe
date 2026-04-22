import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, MoreHorizontal, UserPlus, Trophy } from 'lucide-react';
import { collection, query, limit, getDocs, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import VerifiedBadge from './VerifiedBadge';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import MissionWidget from './MissionWidget';
import SmartSummary from './SmartSummary';

export default function RightSidebar() {
  const { userProfile, followUser, unfollowUser } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!db) return;
    
    // Fetch recent posts to extract real trending hashtags
    const q = query(
      collection(db, 'posts'),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hashtagCounts: Record<string, number> = {};
      
      snapshot.docs.forEach(doc => {
        const content = doc.data().content || '';
        // Extract hashtags using regex
        const matches = content.match(/#[a-zA-Z0-9_À-ÿ]+/g);
        if (matches) {
          matches.forEach((tag: string) => {
            const lowerTag = tag.toLowerCase();
            hashtagCounts[lowerTag] = (hashtagCounts[lowerTag] || 0) + 1;
          });
        }
      });
      
      const sortedTags = Object.entries(hashtagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({
          category: 'Assunto do momento',
          title: tag,
          posts: `${count} posts recentes`
        }));
        
      if (sortedTags.length === 0) {
        setTrendingTopics([
           { category: 'Assunto do momento', title: '#OffMe', posts: 'Lançamento' },
        ]);
      } else {
        setTrendingTopics(sortedTags);
      }
    }, (error) => {
      console.error("Error fetching trending hashtags:", error);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!db || !userProfile?.uid) return;
      setLoading(true);
      try {
        const following = userProfile.following || [];
        let suggestedUids: string[] = [];

        // 1. Try Mutual Connections (Friends of Friends)
        if (following.length > 0) {
          // Fetch a few people the user follows
          const followedUsersQuery = query(
            collection(db, 'users'),
            where('uid', 'in', following.slice(0, 10))
          );
          const followedUsersSnap = await getDocs(followedUsersQuery);
          
          const mutualCandidates: Record<string, number> = {};
          followedUsersSnap.docs.forEach(doc => {
            const data = doc.data();
            const theirFollowing = data.following || [];
            theirFollowing.forEach((uid: string) => {
              if (uid !== userProfile.uid && !following.includes(uid)) {
                mutualCandidates[uid] = (mutualCandidates[uid] || 0) + 1;
              }
            });
          });

          suggestedUids = Object.entries(mutualCandidates)
            .sort(([, a], [, b]) => b - a)
            .map(([uid]) => uid)
            .slice(0, 5);
        }

        // 2. Fallback to Popular Users or Random if not enough mutuals
        if (suggestedUids.length < 3) {
          const popularQuery = query(
            collection(db, 'users'),
            where('uid', '!=', userProfile.uid),
            limit(10)
          );
          const popularSnap = await getDocs(popularQuery);
          const popularUsers = popularSnap.docs
            .map(doc => ({ uid: doc.id, ...doc.data() }))
            .filter(u => !following.includes(u.uid) && !suggestedUids.includes(u.uid));
          
          // Sort by follower count in memory
          const sortedPopular = popularUsers.sort((a: any, b: any) => 
            (b.followers?.length || 0) - (a.followers?.length || 0)
          );

          suggestedUids = [...suggestedUids, ...sortedPopular.map(u => u.uid)].slice(0, 5);
        }

        // Fetch full profiles for the suggested UIDs
        if (suggestedUids.length > 0) {
          const finalQuery = query(
            collection(db, 'users'),
            where('uid', 'in', suggestedUids)
          );
          const finalSnap = await getDocs(finalQuery);
          const finalUsers = finalSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
          setSuggestions(finalUsers);
          
          // Initialize following states
          const states: Record<string, boolean> = {};
          finalUsers.forEach(u => {
            states[u.uid] = following.includes(u.uid);
          });
          setFollowingStates(states);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [userProfile?.uid, userProfile?.following?.length]);

  const handleFollowToggle = async (e: React.MouseEvent, targetUser: any) => {
    e.stopPropagation();
    if (!userProfile) return;

    const isFollowing = followingStates[targetUser.uid];
    
    if (isFollowing) {
      setConfirmModal({
        isOpen: true,
        title: `Deixar de seguir @${targetUser.username}?`,
        message: `As publicações de @${targetUser.username} não aparecerão mais na sua aba Seguindo.`,
        onConfirm: async () => {
          try {
            await unfollowUser(targetUser.uid);
            setFollowingStates(prev => ({ ...prev, [targetUser.uid]: false }));
          } catch (error) {
            console.error('Error unfollowing:', error);
          }
        }
      });
      return;
    }

    try {
      await followUser(targetUser.uid);
      setFollowingStates(prev => ({ ...prev, [targetUser.uid]: true }));
    } catch (error) {
      console.error('Error following:', error);
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-[350px] sticky top-0 h-screen py-4 px-6 space-y-4 overflow-y-auto">
      {/* Search Bar */}
      <div className="sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 pb-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar no Klyp"
            className="block w-full pl-11 pr-4 py-3 bg-gray-100 dark:bg-white/5 border-none rounded-full focus:ring-2 focus:ring-black/5 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-sm dark:text-white"
          />
        </div>
      </div>

      <SmartSummary />

      {userProfile && <MissionWidget userId={userProfile.uid} />}

      {/* Premium Banner */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2 border border-gray-100">
        <h3 className="font-black text-xl">Assine o Premium</h3>
        <p className="text-sm font-medium leading-tight">Assine para desbloquear novos recursos e, se elegível, receba uma parte da receita dos anúncios.</p>
        <button 
          onClick={() => navigate('/premium')}
          className="bg-black text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors"
        >
          Inscrever-se
        </button>
      </div>

      {/* Trending Section */}
      <div className="bg-gray-50 dark:bg-slate-900 amoled:bg-zinc-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-black text-xl">O que está acontecendo</h3>
          <button 
            onClick={() => navigate('/leaderboard')}
            className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl hover:scale-110 transition-transform shadow-sm"
          >
            <Trophy className="w-5 h-5" />
          </button>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {trendingTopics.map((topic, i) => (
            <div key={i} className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors group relative">
              <div className="flex justify-between items-start">
                <span className="text-xs text-gray-500">{topic.category}</span>
                <button className="p-1 hover:bg-black/5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <p className="font-bold text-sm mt-0.5">{topic.title}</p>
              <span className="text-xs text-gray-500">{topic.posts}</span>
            </div>
          ))}
        </div>
        <button className="w-full text-left px-4 py-4 text-blue-500 hover:bg-gray-100 transition-colors text-sm">
          Mostrar mais
        </button>
      </div>

      {/* Who to follow */}
      <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
        <h3 className="font-black text-xl px-4 py-3">Quem seguir</h3>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">Carregando sugestões...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((user) => (
              <div 
                key={user.uid} 
                className="px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between group"
                onClick={() => navigate(`/${user.username}`)}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user.photoURL ? (
                      <LazyImage src={user.photoURL} alt={user.displayName} className="w-full h-full" />
                    ) : (
                      <LazyImage src={getDefaultAvatar(user.displayName, user.username)} alt={user.displayName} className="w-full h-full" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1">
                      <p className="font-bold text-sm truncate group-hover:underline">{user.displayName}</p>
                      {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge className="w-3 h-3" tier={user.premiumTier} />}
                    </div>
                    <p className="text-gray-500 text-xs truncate">@{user.username}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => handleFollowToggle(e, user)}
                  className={`px-4 py-1.5 rounded-full font-bold text-xs transition-colors ${
                    followingStates[user.uid] 
                      ? 'bg-transparent border border-gray-300 text-black hover:bg-red-50 hover:text-red-600 hover:border-red-200 group/btn' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  <span className={followingStates[user.uid] ? 'group-hover/btn:hidden' : ''}>
                    {followingStates[user.uid] ? 'Seguindo' : 'Seguir'}
                  </span>
                  {followingStates[user.uid] && (
                    <span className="hidden group-hover/btn:inline">Deixar de seguir</span>
                  )}
                </button>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">Nenhuma sugestão no momento</div>
          )}
        </div>
        <button className="w-full text-left px-4 py-4 text-blue-500 hover:bg-gray-100 transition-colors text-sm">
          Mostrar mais
        </button>
      </div>

      {/* Footer Links */}
      <div className="px-4 py-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-500">
        <a href="#" className="hover:underline">Termos de Serviço</a>
        <a href="#" className="hover:underline">Política de Privacidade</a>
        <a href="#" className="hover:underline">Política de Cookies</a>
        <a href="#" className="hover:underline">Acessibilidade</a>
        <a href="#" className="hover:underline">Informações de anúncios</a>
        <a href="#" className="hover:underline">Mais...</a>
        <span>© 2026 OffMe Corp.</span>
      </div>

      <ConfirmModal
        {...confirmModal}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </aside>
  );
}
