import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from '../components/VerifiedBadge';
import TrendingPosts from '../components/TrendingPosts';
import GoogleAd from '../components/GoogleAd';
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

export default function Explore() {
  const { userProfile } = useAuth();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
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
    <div className="w-full min-h-full bg-transparent relative">
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-3xl border-b border-white/10 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="w-full max-w-md px-4 py-2 mx-auto">
          <div className="flex items-center space-x-3">
            <button onClick={openDrawer} className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden border border-white/40 shadow-sm">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-full h-full p-2 text-gray-400" />
              )}
            </button>
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..." 
                className="w-full liquid-glass-pill rounded-full py-3 pl-12 pr-4 outline-none border border-white/40 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 pt-4 pb-20">
        {searchQuery.trim() ? (
          loading ? (
            <div className="p-8 text-center text-gray-500">Searching...</div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.map((user, index) => (
                <React.Fragment key={`search-result-${user.id}`}>
                <motion.div 
                  key={user.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 liquid-glass-card rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-white/80 transition-all"
                  onClick={() => navigate(`/profile/${user.id}`)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 min-w-0">
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
                          {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge tier={user.premiumTier} className="flex-shrink-0" />}
                        </div>
                        <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                        {user.bio && <p className="text-gray-600 text-xs mt-1 line-clamp-2 leading-relaxed">{user.bio}</p>}
                      </div>
                    </div>
                    
                    {user.id !== userProfile?.uid && (
                      <div className="flex items-center space-x-2 sm:ml-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(user);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all liquid-glass-pill border border-white/40 text-black hover:bg-white/80 active:scale-95"
                        >
                          Message
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowClick(user);
                          }}
                          className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            userProfile.following?.includes(user.id)
                              ? 'bg-white/40 text-black border border-white/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                              : 'bg-black text-white shadow-lg hover:opacity-90'
                          }`}
                        >
                          {userProfile.following?.includes(user.id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
                {(index + 1) % 2 === 0 && <GoogleAd key={`search-ad-${index}`} slotId="9395334432" />}
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Nenhum usuário encontrado para "{searchQuery}"
            </div>
          )
        ) : (
          <div className="py-6">
            <TrendingPosts />
            
            <div className="mt-8 pt-6">
              <h2 className="px-4 text-xl font-bold mb-4">Suggested for you</h2>
              
              {loadingSuggestions ? (
                <div className="p-8 text-center text-gray-500">Loading suggestions...</div>
              ) : suggestedUsers.length > 0 ? (
                <div className="space-y-3">
                  {suggestedUsers.map((user, index) => (
                    <React.Fragment key={`suggested-${user.id}`}>
                    <motion.div 
                      key={user.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 liquid-glass-card rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-white/80 transition-all"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3 min-w-0">
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
                          {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge tier={user.premiumTier} className="flex-shrink-0" />}
                        </div>
                        <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                        {user.bio && <p className="text-gray-600 text-xs mt-1 line-clamp-2 leading-relaxed">{user.bio}</p>}
                        {user.username === 'Rulio' && (
                          <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">App Creator</p>
                        )}
                      </div>
                    </div>
                    
                    {user.id !== userProfile?.uid && (
                      <div className="flex items-center space-x-2 sm:ml-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMessageClick(user);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all liquid-glass-pill border border-white/40 text-black hover:bg-white/80 active:scale-95"
                        >
                          Message
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFollowClick(user);
                          }}
                          className={`flex-1 sm:flex-none px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            userProfile?.following?.includes(user.id)
                              ? 'bg-white/40 text-black border border-white/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                              : 'bg-black text-white shadow-lg hover:opacity-90'
                          }`}
                        >
                          {userProfile?.following?.includes(user.id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    )}
                  </div>
                    </motion.div>
                    {(index + 1) % 2 === 0 && <GoogleAd key={`suggested-ad-${index}`} slotId="9395334432" />}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  Nenhuma sugestão no momento.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
