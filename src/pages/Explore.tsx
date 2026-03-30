import React, { useState, useEffect } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
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

  useEffect(() => {
    if (!searchQuery.trim() || !db) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'users'),
      where('username', '>=', searchQuery.toLowerCase()),
      where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSearchResults(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return unsubscribe;
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
                <div key={user.id} className="p-4 hover:bg-black/5 transition-colors flex items-center justify-between cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-full h-full p-2 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-black">{user.displayName}</p>
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
                      <button className="px-4 py-1.5 bg-black text-white rounded-full font-bold text-sm hover:bg-gray-800 transition-colors">
                        Seguir
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
          <div className="p-8 text-center text-gray-500">
            <p className="text-xl font-bold mb-2">Descubra novos conteúdos</p>
            <p>Busque por usuários para começar a seguir.</p>
          </div>
        )}
      </div>
    </div>
  );
}
