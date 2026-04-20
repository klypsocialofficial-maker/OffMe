import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Send, Smile, Image as ImageIcon } from 'lucide-react';
import LazyImage from './LazyImage';
import { formatRelativeTime } from '../lib/dateUtils';

interface CommunityChatProps {
  communityId: string;
}

export default function CommunityChat({ communityId }: CommunityChatProps) {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db || !communityId) return;

    const q = query(
      collection(db, `communities/${communityId}/messages`),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setLoading(false);
      
      // Auto scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [communityId, db]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !newMessage.trim() || !db) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `communities/${communityId}/messages`), {
        text: messageText,
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderUsername: userProfile.username,
        senderPhoto: userProfile.photoURL,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 h-[400px]">
        <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[60vh] bg-slate-50 relative overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm font-medium italic">Inicie uma conversa nesta comunidade...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-end space-x-2 ${msg.senderId === userProfile?.uid ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                <LazyImage src={msg.senderPhoto || `https://avatar.vercel.sh/${msg.senderUsername}`} />
              </div>
              <div className={`max-w-[70%] ${msg.senderId === userProfile?.uid ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center space-x-2 px-1 mb-1">
                  <span className="text-[10px] font-black text-gray-500 uppercase">{msg.senderName}</span>
                  <span className="text-[10px] text-gray-300 font-bold">
                    {msg.createdAt?.toDate ? formatRelativeTime(msg.createdAt.toDate()) : ''}
                  </span>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm font-medium shadow-sm ${
                  msg.senderId === userProfile?.uid 
                  ? 'bg-black text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-black/5 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-black/5">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button type="button" className="p-2 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100">
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..." 
              className="w-full bg-gray-100 rounded-2xl py-3 px-4 outline-none border border-transparent focus:bg-white focus:border-black/5 focus:ring-4 focus:ring-black/5 transition-all text-sm font-medium"
            />
          </div>
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-3 bg-black text-white rounded-2xl font-bold shadow-lg shadow-black/10 active:scale-90 transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
