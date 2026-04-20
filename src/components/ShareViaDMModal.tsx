import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Search } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface ShareViaDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: any;
}

export default function ShareViaDMModal({ isOpen, onClose, post }: ShareViaDMModalProps) {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      if (!userProfile?.uid || !db) return;
      // Simple implementation: fetch all users, in production we would need proper search
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const userList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== userProfile.uid);
      setUsers(userList);
    }
    if (isOpen) fetchUsers();
  }, [isOpen, userProfile?.uid]);

  const sharePostToUser = async (targetUserId: string) => {
    setIsSending(true);
    try {
      // Logic to find or create conversation
      const convsRef = collection(db, 'conversations');
      const q = query(convsRef, where('participants', 'array-contains', userProfile!.uid));
      const snapshot = await getDocs(q);
      
      let conversationId = '';
      const existingConv = snapshot.docs.find(doc => doc.data().participants.includes(targetUserId));

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        const newConv = await addDoc(convsRef, {
          participants: [userProfile!.uid, targetUserId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: `Compartilhou um post: ${post.content?.substring(0, 20)}...`
        });
        conversationId = newConv.id;
      }

      // Add message
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        senderId: userProfile!.uid,
        content: `Compartilhei um post com você:`,
        postId: post.id,
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: `Compartilhou um post`,
        updatedAt: serverTimestamp()
      });

      onClose();
    } catch (error) {
      console.error('Error sharing post:', error);
    } finally {
      setIsSending(false);
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
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col h-[80vh]"
          >
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg">Enviar por DM</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
               <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                 <Search className="w-5 h-5 text-gray-500 mr-2" />
                 <input 
                   type="text" 
                   placeholder="Buscar pessoas..." 
                   className="bg-transparent w-full focus:outline-none"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {filteredUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200" />
                            <div>
                                <p className="font-bold">{user.displayName}</p>
                                <p className="text-xs text-gray-500">@{user.username}</p>
                            </div>
                        </div>
                        <button 
                            disabled={isSending}
                            onClick={() => sharePostToUser(user.id)}
                            className="p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
