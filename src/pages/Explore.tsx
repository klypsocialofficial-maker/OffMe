import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import TrendingPosts from '../components/TrendingPosts';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, addDoc, serverTimestamp, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';

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
  const [loading, setLoading] = useState(false);

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
              photoURL: userProfile.photoURL || null
            },
            [otherUser.id]: {
              displayName: otherUser.displayName,
              username: otherUser.username,
              photoURL: otherUser.photoURL || null
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
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50">
        <div className="flex items-center space-x-4">
          <button onClick={openDrawer} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-1.5 text-gray-400" />
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuários no OffMe" 
              className="w-full bg-black/5 rounded-full py-2 pl-10 pr-4 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() ? (
          loading ? (
            <div className="p-8 text-center text-gray-500">Buscando...</div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {searchResults.map(user => (
                <div 
                  key={user.id} 
                  className="p-4 hover:bg-black/5 transition-colors flex items-center justify-between cursor-pointer"
                  onClick={() => navigate(`/profile/${user.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-full h-full p-2 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1">
                        <p className="font-bold text-black">{user.displayName}</p>
                        {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge />}
                      </div>
                      <p className="text-gray-500 text-sm">@{user.username}</p>
                      <p className="text-gray-700 text-sm mt-1 line-clamp-1">{user.bio}</p>
                    </div>
                  </div>
                  {user.id !== userProfile?.uid && (
                    <div className="flex space-x-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessageClick(user);
                        }}
                        className="px-4 py-1.5 bg-gray-100 text-black rounded-full font-bold text-sm hover:bg-gray-200 transition-colors"
                      >
                        Mensagem
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowClick(user);
                        }}
                        className={`px-4 py-1.5 rounded-full font-bold text-sm transition-colors ${
                          userProfile.following?.includes(user.id)
                            ? 'bg-white text-black border border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                            : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      >
                        {userProfile.following?.includes(user.id) ? 'Seguindo' : 'Seguir'}
                      </button>
                    </div>
                  )}
                </div>
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
            <div className="p-8 text-center text-gray-500">
              <p className="text-xl font-bold mb-2">Descubra novos conteúdos</p>
              <p>Busque por usuários para começar a seguir.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
