import React, { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, auth } from '../firebase';
import { Conversation } from '../types';
import { useDrawer } from '../contexts/DrawerContext';
import { MessageSquare, Search, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { openDrawer } = useDrawer();
  const user = auth.currentUser;
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ ...doc.data() } as Conversation));
      setConversations(convs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={openDrawer}
            className="sm:hidden focus:outline-none active:scale-95 transition-transform"
          >
            <img
              src={auth.currentUser?.photoURL || 'https://picsum.photos/seed/user/100/100'}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-gray-100"
              referrerPolicy="no-referrer"
            />
          </button>
          <h2 className="text-2xl font-black tracking-tight">Messages</h2>
        </div>
        <button 
          onClick={() => navigate('/explore')}
          className="p-2 hover:bg-gray-50 rounded-2xl transition-colors"
        >
          <Search className="w-6 h-6" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="divide-y divide-gray-50">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 px-6">
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">No messages yet</h3>
              <p className="text-gray-400 font-medium max-w-xs">Start a conversation by finding someone in the explore tab.</p>
              <button 
                onClick={() => navigate('/explore')}
                className="mt-6 px-8 py-3 bg-black text-white rounded-full font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95"
              >
                Find people
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {conversations.map((conv) => (
              <ConversationRow key={conv.id} conversation={conv} currentUserId={user?.uid || ''} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ConversationRow({ conversation, currentUserId }: { conversation: Conversation, currentUserId: string }) {
  const otherUserId = conversation.participants.find(id => id !== currentUserId);
  const otherUserInfo = otherUserId ? conversation.participantInfo?.[otherUserId] : null;

  if (!otherUserInfo) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Link
        to={`/messages/${conversation.id}`}
        className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-all group"
      >
        <div className="relative">
          <img
            src={otherUserInfo.photoURL || 'https://picsum.photos/seed/user/100/100'}
            alt={otherUserInfo.displayName}
            className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm group-hover:shadow-md transition-all"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-black text-black tracking-tight truncate">{otherUserInfo.displayName}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
              {conversation.lastMessageAt ? formatDistanceToNow(conversation.lastMessageAt.toDate(), { addSuffix: false }) : ''}
            </p>
          </div>
          <p className="text-sm text-gray-500 font-medium truncate">
            {conversation.lastMessageSenderId === currentUserId ? 'You: ' : ''}
            {conversation.lastMessage || 'No messages yet'}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
