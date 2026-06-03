import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, ChevronRight } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getDefaultAvatar } from '../lib/avatar';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUsers() {
      if (!userProfile?.uid || !db) return;
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== userProfile.uid);
      setUsers(userList);
    }
    if (isOpen) fetchUsers();
  }, [isOpen, userProfile?.uid]);

  const startChat = async (targetUser: any) => {
    setIsStarting(true);
    try {
      const convsRef = collection(db, 'conversations');
      const q = query(convsRef, where('participants', 'array-contains', userProfile!.uid));
      const snapshot = await getDocs(q);
      
      let conversationId = '';
      const existingConv = snapshot.docs.find(doc => doc.data().participants.includes(targetUser.id));

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const newConv = await addDoc(convsRef, {
          participants: [userProfile!.uid, targetUser.id],
          participantInfo: {
            [userProfile!.uid]: {
              displayName: userProfile!.displayName,
              username: userProfile!.username,
              photoURL: userProfile!.photoURL || null
            },
            [targetUser.id]: {
              displayName: targetUser.displayName,
              username: targetUser.username,
              photoURL: targetUser.photoURL || null
            }
          },
          lastMessage: '',
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        conversationId = newConv.id;
      }

      onClose();
      navigate(`/messages/${conversationId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[80vh] sm:h-[60vh] sm:max-h-[600px]"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 sticky top-0">
              <h3 className="font-bold text-lg text-gray-900">Nova Mensagem</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100 bg-white z-10 sticky top-[69px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar pessoas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-full text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
              {filteredUsers.length > 0 ? (
                <div className="flex flex-col">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startChat(user)}
                      disabled={isStarting}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <img 
                          src={user.photoURL || getDefaultAvatar(user.displayName, user.username)} 
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="text-left flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900 truncate">{user.displayName}</p>
                          <p className="text-gray-500 text-xs truncate">@{user.username}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  {searchTerm ? 'Nenhum usuário encontrado.' : 'Comece a digitar para buscar.'}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
