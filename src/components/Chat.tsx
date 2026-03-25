import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, collection, query, orderBy, onSnapshot, auth, doc, getDoc } from '../firebase';
import { Conversation, Message } from '../types';
import { ArrowLeft, Send, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatService } from '../services/chatService';
import { formatDistanceToNow } from 'date-fns';

export default function Chat() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const user = auth.currentUser;
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Fetch conversation info
    const fetchConv = async () => {
      const convSnap = await getDoc(doc(db, 'conversations', conversationId));
      if (convSnap.exists()) {
        setConversation({ ...convSnap.data() } as Conversation);
      } else {
        navigate('/messages');
      }
    };
    fetchConv();

    // Fetch messages
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ ...doc.data() } as Message));
      setMessages(msgs);
      setLoading(false);
      scrollToBottom();
    }, (error) => {
      console.error("Error fetching messages:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId, user?.uid]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !conversationId || sending) return;

    setSending(true);
    try {
      await chatService.sendMessage(conversationId, user.uid, content.trim());
      setContent('');
      scrollToBottom();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  const otherUserId = conversation?.participants.find(id => id !== user?.uid);
  const otherUserInfo = otherUserId ? conversation?.participantInfo?.[otherUserId] : null;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/messages')}
          className="p-2 hover:bg-gray-50 rounded-2xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        {otherUserInfo && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={otherUserInfo.photoURL || 'https://picsum.photos/seed/user/100/100'}
              alt={otherUserInfo.displayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div className="overflow-hidden">
              <p className="font-black text-black tracking-tight truncate">{otherUserInfo.displayName}</p>
              <p className="text-xs text-gray-400 font-medium truncate">@{otherUserInfo.username}</p>
            </div>
          </div>
        )}
        
        <button className="p-2 hover:bg-gray-50 rounded-2xl transition-colors">
          <Info className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.uid} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-50 border border-transparent focus:border-black focus:bg-white rounded-2xl px-4 py-3 outline-none font-bold transition-all"
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-3 bg-black text-white rounded-2xl shadow-xl hover:shadow-2xl active:scale-95 transition-all disabled:opacity-30"
          >
            {sending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message, isOwn: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={cn(
        "flex flex-col max-w-[80%]",
        isOwn ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div className={cn(
        "px-4 py-3 rounded-3xl text-sm font-bold shadow-sm",
        isOwn 
          ? "bg-black text-white rounded-tr-none" 
          : "bg-gray-100 text-black rounded-tl-none"
      )}>
        {message.content}
      </div>
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1 px-1">
        {message.createdAt ? formatDistanceToNow(message.createdAt.toDate(), { addSuffix: true }) : ''}
      </p>
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
