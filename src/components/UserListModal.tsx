import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, CheckCircle2, Lock } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import VerifiedBadge from './VerifiedBadge';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  uids: string[];
  isBlockedList?: boolean;
}

export default function UserListModal({ isOpen, onClose, title, uids, isBlockedList }: UserListModalProps) {
  const { userProfile, followUser, unfollowUser, unblockUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen || uids.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const fetchedUsers: any[] = [];
        // Firestore 'in' query is limited to 30 elements
        const chunks = [];
        for (let i = 0; i < uids.length; i += 30) {
          chunks.push(uids.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('uid', 'in', chunk));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(doc => {
            fetchedUsers.push({ uid: doc.id, ...doc.data() });
          });
        }

        setUsers(fetchedUsers);

        // Initialize following states
        const states: Record<string, boolean> = {};
        fetchedUsers.forEach(u => {
          states[u.uid] = userProfile?.following?.includes(u.uid) || false;
        });
        setFollowingStates(states);
      } catch (error) {
        console.error('Error fetching users for list:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, uids, userProfile?.following?.length, userProfile?.blockedUsers?.length]);

  const handleFollowToggle = async (e: React.MouseEvent, targetUser: any) => {
    e.stopPropagation();
    if (!userProfile) return;

    if (isBlockedList) {
      try {
        await unblockUser(targetUser.uid);
      } catch (error) {
        console.error('Error unblocking user:', error);
      }
      return;
    }

    const isFollowing = followingStates[targetUser.uid];
    try {
      if (isFollowing) {
        await unfollowUser(targetUser.uid);
        setFollowingStates(prev => ({ ...prev, [targetUser.uid]: false }));
      } else {
        await followUser(targetUser.uid);
        setFollowingStates(prev => ({ ...prev, [targetUser.uid]: true }));
      }
    } catch (error) {
      console.error('Error toggling follow in list:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-black text-xl text-black">{title}</h3>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-black" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="flex space-x-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-black rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                </div>
              ) : users.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {users.map((user) => (
                    <div 
                      key={user.uid} 
                      className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                      onClick={() => {
                        onClose();
                        navigate(`/${user.username}`);
                      }}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                          {user.photoURL ? (
                            <LazyImage src={user.photoURL} alt={user.displayName} className="w-full h-full" />
                          ) : (
                            <LazyImage src={getDefaultAvatar(user.displayName, user.username)} alt={user.displayName} className="w-full h-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1">
                            <p className="font-bold text-gray-900 truncate group-hover:underline">{user.displayName}</p>
                            {user.privateProfile && <Lock className="w-3 h-3 text-gray-400" />}
                            {(user.isVerified || user.username === 'Rulio') && <VerifiedBadge className="w-4 h-4" tier={user.premiumTier} />}
                          </div>
                          <p className="text-gray-500 text-sm truncate">@{user.username}</p>
                          {user.bio && <p className="text-gray-600 text-xs mt-0.5 truncate max-w-[200px]">{user.bio}</p>}
                        </div>
                      </div>

                      {user.uid !== userProfile?.uid && (
                        <button 
                          onClick={(e) => handleFollowToggle(e, user)}
                          className={`px-4 py-2 rounded-full font-bold text-sm transition-all active:scale-95 flex-shrink-0 ${
                            isBlockedList
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : followingStates[user.uid] 
                                ? 'bg-transparent border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 group/btn' 
                                : 'bg-black text-white hover:bg-gray-800 shadow-sm'
                          }`}
                        >
                          {isBlockedList ? (
                            'Desbloquear'
                          ) : (
                            <>
                              <span className={followingStates[user.uid] ? 'group-hover/btn:hidden' : ''}>
                                {followingStates[user.uid] ? 'Seguindo' : 'Seguir'}
                              </span>
                              {followingStates[user.uid] && (
                                <span className="hidden group-hover/btn:inline">Deixar de seguir</span>
                              )}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-gray-500 font-medium">{isBlockedList ? 'Nenhuma conta bloqueada' : 'Nenhum usuário encontrado'}</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
