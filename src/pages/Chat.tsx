import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, User as UserIcon } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!conversationId || !db) return;

    const fetchConversation = async () => {
      try {
        const docRef = doc(db, 'conversations', conversationId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConversation({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.log("No such conversation!");
          navigate('/messages');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `conversations/${conversationId}`);
      }
    };

    fetchConversation();

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
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`);
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userProfile?.uid || !conversationId || !db) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Optimistic clear

    try {
      // Add message to subcollection
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        text: messageText,
        senderId: userProfile.uid,
        createdAt: serverTimestamp(),
      });

      // Update conversation metadata
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: messageText,
        updatedAt: serverTimestamp(),
      });
      
      scrollToBottom();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
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
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-30 px-4 py-3 border-b border-gray-100 flex items-center space-x-4">
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
              {(otherParticipantInfo?.isVerified || otherParticipantInfo?.username === 'Rulio') && <VerifiedBadge />}
            </div>
            <p className="text-xs text-gray-500">@{otherParticipantInfo?.username || 'usuario'}</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isMine = msg.senderId === userProfile?.uid;
          const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              {!isMine && (
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mr-2 self-end mb-1">
                  {showAvatar && (
                    otherParticipantInfo?.photoURL ? (
                      <img src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-1.5 text-gray-400" />
                    )
                  )}
                </div>
              )}
              <div 
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMine 
                    ? 'bg-blue-500 text-white rounded-br-sm' 
                    : 'bg-gray-100 text-black rounded-bl-sm'
                }`}
              >
                <p className="break-words">{msg.text}</p>
              </div>
            </div>
          );
        })}
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
            onChange={(e) => setNewMessage(e.target.value)}
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
