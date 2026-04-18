import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon, TrendingUp, Music, Trophy, Tv, Cpu, Hash, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from '../components/VerifiedBadge';
import TrendingPosts from '../components/TrendingPosts';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, addDoc, serverTimestamp, getDocs, doc, updateDoc, arrayUnion, arrayRemove, orderBy, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { rankSuggestedUsers } from '../lib/gemini';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const CATEGORIES = [
  { id: 'foryou', label: 'Para você', icon: UserIcon },
  { id: 'trending', label: 'Em alta', icon: TrendingUp },
  { id: 'news', label: 'Notícias', icon: Hash },
  { id: 'sports', label: 'Esportes', icon: Trophy },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'entertainment', label: 'Entretenimento', icon: Tv },
  { id: 'tech', label: 'Tecnologia', icon: Cpu },
];

const TRENDING_HASHTAGS = [
  { tag: 'Offme', posts: '125K', category: 'Tech' },
  { tag: 'Rulio', posts: '89K', category: 'Creator' },
  { tag: 'Antigravity', posts: '54K', category: 'Coding' },
  { tag: 'Brasil', posts: '210K', category: 'News' },
  { tag: 'Futebol', posts: '150K', category: 'Sports' },
];

export default function Explore() {
  const { userProfile } = useAuth();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('foryou');
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const handleMessageClick = async (otherUser: any) => {
    if (!userProfile?.uid || !db) return;

    try {
      // Check if conversation already exists
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userProfile.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingConversationId = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(otherUser.id)) {
          existingConversationId = doc.id;
        }
      });

      if (existingConversationId) {
        navigate(`/messages/${existingConversationId}`);
      } else {
        // Create new conversation
        const newConversationRef = await addDoc(collection(db, 'conversations'), {
          participants: [userProfile.uid, otherUser.id],
          participantInfo: {
            [userProfile.uid]: {
              displayName: userProfile.displayName,
              username: userProfile.username,
              photoURL: userProfile.photoURL || null,
              isVerified: userProfile.isVerified || false,
              premiumTier: userProfile.premiumTier || null
            },
            [otherUser.id]: {
              displayName: otherUser.displayName,
              username: otherUser.username,
              photoURL: otherUser.photoURL || null,
              isVerified: otherUser.isVerified || false,
              premiumTier: otherUser.premiumTier || null
            }
          },
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        navigate(`/messages/${newConversationRef.id}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations');
    }
  };

  const handleFollowClick = async (otherUser: any) => {
    if (!userProfile?.uid || !db) return;
    
    const isFollowing = userProfile.following?.includes(otherUser.id);
    
    try {
      // Update current user's following list
      await updateDoc(doc(db, 'users', userProfile.uid), {
        following: isFollowing ? arrayRemove(otherUser.id) : arrayUnion(otherUser.id)
      });
      
      // Update target user's followers list
      await updateDoc(doc(db, 'users', otherUser.id), {
        followers: isFollowing ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid)
      });
      
      // Create notification if following
      if (!isFollowing) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: otherUser.id,
          senderId: userProfile.uid,
          senderName: userProfile.displayName,
          senderUsername: userProfile.username,
          senderPhoto: userProfile.photoURL || null,
          senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
          senderPremiumTier: userProfile.premiumTier || null,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  useEffect(() => {
    if (!db || !userProfile?.uid) return;

    const fetchAdvancedSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const candidatesMap = new Map<string, any>();
        const userInterests: string[] = [];

        // 1. Fetch Verified Users
        const qVerified = query(collection(db, 'users'), where('isVerified', '==', true), limit(15));
        const verifiedSnap = await getDocs(qVerified);
        verifiedSnap.forEach(doc => {
          if (doc.id !== userProfile.uid && !userProfile.following?.includes(doc.id)) {
            candidatesMap.set(doc.id, { id: doc.id, ...doc.data() });
          }
        });

        // 2. Fetch Mutual Followers (Friends of Friends)
        if (userProfile.following && userProfile.following.length > 0) {
          const friendsToSample = userProfile.following.slice(0, 5);
          for (const friendId of friendsToSample) {
            const friendDoc = await getDoc(doc(db, 'users', friendId));
            if (friendDoc.exists()) {
              const friendData = friendDoc.data();
              if (friendData.following && friendData.following.length > 0) {
                const friendsOfFriend = friendData.following.slice(0, 5);
                for (const fofId of friendsOfFriend) {
                  if (fofId !== userProfile.uid && !userProfile.following.includes(fofId) && !candidatesMap.has(fofId)) {
                    const fofDoc = await getDoc(doc(db, 'users', fofId));
                    if (fofDoc.exists()) {
                      candidatesMap.set(fofId, { id: fofId, ...fofDoc.data() });
                    }
                  }
                }
              }
            }
          }
        }

        // 3. Fetch Mentioned Users in Liked/Reposted Posts
        const qLiked = query(collection(db, 'posts'), where('likes', 'array-contains', userProfile.uid), limit(10));
        const qReposted = query(collection(db, 'posts'), where('reposts', 'array-contains', userProfile.uid), limit(10));
        
        const [likedSnap, repostedSnap] = await Promise.all([getDocs(qLiked), getDocs(qReposted)]);
        const interactedPosts = [...likedSnap.docs, ...repostedSnap.docs];

        for (const postDoc of interactedPosts) {
          const postData = postDoc.data();
          if (postData.content) {
            userInterests.push(postData.content);
            // Extract mentions
            const mentions = postData.content.match(/@(\w+)/g);
            if (mentions) {
              for (const mention of mentions) {
                const username = mention.substring(1);
                const qMentioned = query(collection(db, 'users'), where('username', '==', username), limit(1));
                const mentionedSnap = await getDocs(qMentioned);
                if (!mentionedSnap.empty) {
                  const mentionedUser = mentionedSnap.docs[0];
                  if (mentionedUser.id !== userProfile.uid && !userProfile.following?.includes(mentionedUser.id) && !candidatesMap.has(mentionedUser.id)) {
                    candidatesMap.set(mentionedUser.id, { id: mentionedUser.id, ...mentionedUser.data() });
                  }
                }
              }
            }
          }
        }

        // 4. Fallback: Latest Users if we have very few candidates
        if (candidatesMap.size < 5) {
          const qLatest = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10));
          const latestSnap = await getDocs(qLatest);
          latestSnap.forEach(doc => {
            if (doc.id !== userProfile.uid && !userProfile.following?.includes(doc.id) && !candidatesMap.has(doc.id)) {
              candidatesMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
          });
        }

        const candidates = Array.from(candidatesMap.values());
        
        // 5. Gemini Ranking
        if (candidates.length > 0) {
          const rankedIds = await rankSuggestedUsers(userInterests.slice(0, 10), candidates);
          const rankedUsers = rankedIds
            .map((id: string) => candidates.find(c => c.id === id))
            .filter(Boolean);
          
          // Combine ranked users with any remaining candidates
          const finalUsers = [...rankedUsers, ...candidates.filter(c => !rankedIds.includes(c.id))];
          setSuggestedUsers(finalUsers.slice(0, 10));
        } else {
          setSuggestedUsers([]);
        }
      } catch (error) {
        console.error("Error fetching advanced suggestions:", error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchAdvancedSuggestions();
  }, [userProfile?.uid, userProfile?.following]);

  useEffect(() => {
    const cleanQuery = searchQuery.trim().replace(/^@/, '');
    
    if (!cleanQuery || !db) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    
    // We run multiple queries to simulate a more flexible search
    // 1. Exact case match for username
    const qUsername = query(
      collection(db, 'users'),
      where('username', '>=', cleanQuery),
      where('username', '<=', cleanQuery + '\uf8ff'),
      limit(10)
    );
    
    // 2. Lowercase match for username (common case)
    const qUsernameLower = query(
      collection(db, 'users'),
      where('username', '>=', cleanQuery.toLowerCase()),
      where('username', '<=', cleanQuery.toLowerCase() + '\uf8ff'),
      limit(10)
    );

    // 3. Exact case match for displayName
    const qDisplayName = query(
      collection(db, 'users'),
      where('displayName', '>=', cleanQuery),
      where('displayName', '<=', cleanQuery + '\uf8ff'),
      limit(10)
    );

    // 4. Capitalized match for displayName (e.g. "joao" -> "Joao")
    const capitalizedQuery = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1).toLowerCase();
    const qDisplayNameCap = query(
      collection(db, 'users'),
      where('displayName', '>=', capitalizedQuery),
      where('displayName', '<=', capitalizedQuery + '\uf8ff'),
      limit(10)
    );

    const fetchResults = async () => {
      try {
        const [snap1, snap2, snap3, snap4] = await Promise.all([
          getDocs(qUsername),
          getDocs(qUsernameLower),
          getDocs(qDisplayName),
          getDocs(qDisplayNameCap)
        ]);

        const resultsMap = new Map();
        
        const addDocs = (snapshot: any) => {
          snapshot.docs.forEach((doc: any) => {
            if (!resultsMap.has(doc.id)) {
              resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
          });
        };

        addDocs(snap1);
        addDocs(snap2);
        addDocs(snap3);
        addDocs(snap4);

        setSearchResults(Array.from(resultsMap.values()).slice(0, 20));
      } catch (error) {
        console.error("Error searching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery]);

  return (
    <div className="w-full min-h-full bg-slate-50 relative">
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-black/5 pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 py-3">
          <div className="flex items-center space-x-3">
            <button onClick={openDrawer} className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden border border-white/40 shadow-sm transition-transform active:scale-95">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-full h-full p-2 text-gray-400" />
              )}
            </button>
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Explorar pessoas e assuntos..." 
                className="w-full bg-gray-100 rounded-2xl py-3 pl-12 pr-4 outline-none border border-transparent focus:bg-white focus:border-black/10 focus:ring-4 focus:ring-black/5 transition-all text-sm"
              />
            </div>
          </div>
        </div>

        {!searchQuery.trim() && (
          <div className="px-2 pb-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-1 min-w-max px-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all relative whitespace-nowrap ${
                    activeTab === cat.id 
                    ? 'text-black' 
                    : 'text-gray-500 hover:text-black hover:bg-gray-100'
                  }`}
                >
                  {cat.label}
                  {activeTab === cat.id && (
                    <motion.div 
                      layoutId="explore-tab-indicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-black rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="pb-24">
        <AnimatePresence mode="wait">
          {searchQuery.trim() ? (
            <motion.div 
              key="search-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 mt-4"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm font-medium">Buscando...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <motion.div 
                      key={`search-${user.id}`} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-white rounded-2xl shadow-sm border border-black/5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
                      onClick={() => navigate(`/${user.username}`)}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-white/40 shadow-sm">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-full h-full p-2 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1">
                            <p className="font-bold text-black truncate">{user.displayName}</p>
                            {(user.isVerified || user.username === 'Rulio') && (
                              <VerifiedBadge tier={user.premiumTier} className="flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                        </div>
                      </div>
                      
                      {user.id !== userProfile?.uid && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowClick(user);
                          }}
                          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            userProfile?.following?.includes(user.id)
                              ? 'bg-gray-100 text-gray-600 border border-black/5'
                              : 'bg-black text-white shadow-lg'
                          }`}
                        >
                          {userProfile?.following?.includes(user.id) ? 'Seguindo' : 'Seguir'}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-900">Nenhum resultado</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    Não encontramos ninguém com "{searchQuery}"
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="explore-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Featured Hero Card */}
                  {activeTab === 'foryou' && (
                    <div className="px-4 mb-8">
                      <div className="relative h-48 rounded-3xl overflow-hidden group cursor-pointer shadow-xl">
                        <img 
                          src="https://picsum.photos/seed/offme/800/400" 
                          alt="Featured" 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6">
                          <span className="bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md mb-2 inline-block">Destaque</span>
                          <h2 className="text-2xl font-black text-white mb-1 leading-tight">O futuro das redes sociais</h2>
                          <p className="text-white/80 text-sm font-medium">Veja o que está acontecendo no Offme hoje.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sections based on tab */}
                  {activeTab === 'foryou' || activeTab === 'trending' ? (
                    <>
                      <div className="mb-0">
                        <TrendingPosts isFullList={activeTab === 'trending'} />
                      </div>
                      
                      {activeTab === 'foryou' && (
                        <div className="px-4 mt-8">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black tracking-tight">O que está acontecendo</h2>
                          </div>
                          <div className="bg-white rounded-3xl border border-black/5 divide-y divide-black/5 overflow-hidden shadow-sm">
                            {TRENDING_HASHTAGS.map((trend) => (
                              <button 
                                key={trend.tag}
                                className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">{trend.category} · Em alta</p>
                                  <p className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">#{trend.tag}</p>
                                  <p className="text-xs text-gray-500">{trend.posts} posts</p>
                                </div>
                                <MoreHorizontal className="w-5 h-5 text-gray-300 group-hover:text-gray-600" />
                              </button>
                            ))}
                            <button className="w-full p-4 text-sm font-bold text-blue-500 hover:bg-gray-50 transition-colors text-left">
                              Mostrar mais
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Hash className="w-8 h-8 text-gray-300" />
                      </div>
                      <h3 className="font-bold text-gray-900">Seção {CATEGORIES.find(c => c.id === activeTab)?.label}</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Esta área será preenchida com conteúdo relevante de {CATEGORIES.find(c => c.id === activeTab)?.label.toLowerCase()}.
                      </p>
                    </div>
                  )}

                  {/* Suggestions (Always show at bottom of For You) */}
                  {activeTab === 'foryou' && (
                    <>
                      <div className="mt-8 px-4">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-black tracking-tight">Pessoas que você pode conhecer</h2>
                        </div>
                        
                        {loadingSuggestions ? (
                          <div className="space-y-3">
                            {[1,2,3].map(i => (
                              <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                            ))}
                          </div>
                        ) : suggestedUsers.length > 0 ? (
                          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4">
                            {suggestedUsers.map((user) => (
                              <motion.div 
                                key={`suggested-card-${user.id}`}
                                className="w-48 flex-shrink-0 bg-white p-5 rounded-3xl border border-black/5 shadow-sm text-center flex flex-col items-center group cursor-pointer hover:shadow-md transition-all"
                                onClick={() => navigate(`/${user.username}`)}
                              >
                                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden mb-3 border-4 border-white shadow-sm ring-1 ring-black/5">
                                  {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                  ) : (
                                    <UserIcon className="w-full h-full p-4 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0 w-full mb-3">
                                  <div className="flex items-center justify-center space-x-1">
                                    <p className="font-bold text-black truncate text-sm">{user.displayName}</p>
                                    {(user.isVerified || user.username === 'Rulio') && (
                                      <VerifiedBadge tier={user.premiumTier} className="w-3 h-3 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-gray-500 text-xs truncate">@{user.username}</p>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFollowClick(user);
                                  }}
                                  className={`w-full py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
                                    userProfile?.following?.includes(user.id)
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-black text-white'
                                  }`}
                                >
                                  {userProfile?.following?.includes(user.id) ? 'Seguindo' : 'Seguir'}
                                </button>
                              </motion.div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-8 px-4">
                        <h2 className="text-xl font-black tracking-tight mb-4">Navegar por Categorias</h2>
                        <div className="grid grid-cols-2 gap-3">
                          {CATEGORIES.slice(2).map((cat, i) => (
                            <button
                              key={`cat-card-${cat.id}`}
                              onClick={() => setActiveTab(cat.id)}
                              className="relative h-24 rounded-2xl overflow-hidden group border border-black/5 shadow-sm"
                            >
                              <img 
                                src={`https://picsum.photos/seed/${cat.id}/300/200`} 
                                alt={cat.label} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-slate-900/20 transition-colors" />
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                <cat.icon className="w-6 h-6 mb-1 opacity-80" />
                                <span className="text-xs font-black uppercase tracking-widest">{cat.label}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
