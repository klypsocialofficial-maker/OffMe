import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, User as UserIcon, Trash2, Check, CheckCheck } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
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

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversationId || !db) return;

    // Reset unread count for current user
    if (userProfile?.uid) {
      updateDoc(doc(db, 'conversations', conversationId), {
        [`unreadCount.${userProfile.uid}`]: 0
      }).catch(err => console.error("Error resetting unread count:", err));
    }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(results);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      // Mark unread messages from other user as read
      if (userProfile?.uid) {
        const unreadFromOther = snapshot.docs.filter(d => 
          d.data().senderId !== userProfile.uid && !d.data().read
        );
        if (unreadFromOther.length > 0) {
          const batch = writeBatch(db);
          unreadFromOther.forEach(d => {
            batch.update(doc(db, 'conversations', conversationId, 'messages', d.id), { read: true });
          });
          // Also reset unreadCount in the conversation document
          batch.update(doc(db, 'conversations', conversationId), {
            [`unreadCount.${userProfile.uid}`]: 0
          });
          batch.commit().catch(err => console.error("Error marking messages as read:", err));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`);
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId, navigate, userProfile?.uid]);

  useEffect(() => {
    if (!conversationId || !db || !userProfile?.uid) return;

    // Listen for conversation updates (typing, metadata)
    const unsubscribe = onSnapshot(doc(db, 'conversations', conversationId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConversation({ id: docSnap.id, ...data });
        
        const otherId = data.participants.find((id: string) => id !== userProfile.uid);
        if (otherId && data.typing) {
          setOtherUserTyping(!!data.typing[otherId]);
        }
      } else {
        navigate('/messages');
      }
    });

    return () => {
      unsubscribe();
      // Clear our typing status when leaving
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${userProfile.uid}`]: false
      }).catch(() => {});
    };
  }, [conversationId, userProfile?.uid, navigate]);

  const handleTyping = () => {
    if (!conversationId || !userProfile?.uid || !db) return;

    if (!isTyping) {
      setIsTyping(true);
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${userProfile.uid}`]: true
      }).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${userProfile.uid}`]: false
      }).catch(() => {});
    }, 3000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile?.uid || !conversationId || !db) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Optimistic clear
    
    // Clear typing status immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    updateDoc(doc(db, 'conversations', conversationId), {
      [`typing.${userProfile.uid}`]: false
    }).catch(() => {});

    try {
      // Add message to subcollection
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text: messageText,
        senderId: userProfile.uid,
        createdAt: serverTimestamp(),
        read: false
      });

      // Update conversation metadata
      const otherId = conversation.participants.find((id: string) => id !== userProfile.uid);
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: messageText,
        lastMessageSenderId: userProfile.uid,
        updatedAt: serverTimestamp(),
        [`unreadCount.${otherId}`]: increment(1)
      });
      
      scrollToBottom();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!conversationId || !db) return;
    
    try {
      // Soft delete: mark as deleted
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        isDeleted: true,
        text: 'Mensagem apagada',
        updatedAt: serverTimestamp()
      });
      setSelectedMessageId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando mensagens...</div>;
  }

  const otherParticipantId = conversation?.participants?.find((id: string) => id !== userProfile?.uid);
  const otherParticipantInfo = conversation?.participantInfo?.[otherParticipantId];

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-30 border-b border-gray-100 pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-4">
          <button onClick={() => navigate('/messages')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
              {otherParticipantInfo?.photoURL ? (
                <img src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-full h-full p-2 text-gray-400" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <h2 className="font-bold leading-tight">{otherParticipantInfo?.displayName || 'Usuário'}</h2>
                {(otherParticipantInfo?.isVerified || otherParticipantInfo?.username === 'Rulio') && <VerifiedBadge tier={otherParticipantInfo?.premiumTier} />}
              </div>
              <p className="text-xs text-gray-500">@{otherParticipantInfo?.username || 'usuario'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => setSelectedMessageId(null)}>
        {messages.map((msg, index) => {
          const isMine = msg.senderId === userProfile?.uid;
          const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);
          const isSelected = selectedMessageId === msg.id;

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mr-2 self-end mb-1">
                    {showAvatar ? (
                      otherParticipantInfo?.photoURL ? (
                        <img src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-full h-full p-1.5 text-gray-400" />
                      )
                    ) : (
                      <div className="w-8 h-8" /> // Placeholder to maintain alignment
                    )}
                  </div>
                )}
                <div 
                  onClick={(e) => {
                    if (isMine && !msg.isDeleted) {
                      e.stopPropagation();
                      setSelectedMessageId(isSelected ? null : msg.id);
                    }
                  }}
                  className={`max-w-[75%] rounded-2xl px-4 py-2 cursor-pointer transition-all ${
                    isMine 
                      ? msg.isDeleted 
                        ? 'bg-gray-100 text-gray-400 italic rounded-br-sm border border-gray-200'
                        : 'bg-blue-500 text-white rounded-br-sm hover:bg-blue-600' 
                      : msg.isDeleted
                        ? 'bg-gray-50 text-gray-400 italic rounded-bl-sm border border-gray-100'
                        : 'bg-gray-100 text-black rounded-bl-sm'
                  } ${isSelected ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
                >
                  <p className="break-words text-sm">{msg.text}</p>
                  {isMine && !msg.isDeleted && (
                    <div className="flex justify-end mt-1 items-center space-x-1">
                      <span className="text-[10px] opacity-70">
                        {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {msg.read ? (
                        <CheckCheck className="w-3 h-3 text-blue-200" />
                      ) : (
                        <Check className="w-3 h-3 text-blue-100" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Delete Action (Mobile-friendly "long-press" simulation via click) */}
              {isSelected && isMine && !msg.isDeleted && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 flex items-center space-x-2"
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMessage(msg.id);
                    }}
                    className="flex items-center space-x-1 text-xs text-red-500 font-medium hover:bg-red-50 px-2 py-1 rounded-full transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Apagar para todos</span>
                  </button>
                </motion.div>
              )}
            </div>
          );
        })}
          {otherUserTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-2"
            >
              <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-tl-none text-xs text-gray-500 italic flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Digitando...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
          <button type="button" className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0">
            <ImageIcon className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Comece uma mensagem"
            className="flex-1 bg-transparent outline-none py-2"
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
