import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, User as UserIcon, Trash2, Check, CheckCheck, Mic, Flame, X, Smile, Sticker as StickerIcon, Phone, Video, CornerUpLeft } from 'lucide-react';
import { triggerHaptic } from '../hooks/useHaptic';
import { sendPushNotification } from '../lib/notifications';
import VerifiedBadge from '../components/VerifiedBadge';
import LazyImage from '../components/LazyImage';
import { useAuth } from '../contexts/AuthContext';
import { useCall } from '../contexts/CallContext';
import { getDefaultAvatar } from '../lib/avatar';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, writeBatch, increment, limit, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import ConfirmModal from '../components/ConfirmModal';
import { uploadToImgBB } from '../lib/imgbb';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('rJC35Qp0ILjTI6mBlDGRcKCNnCucBBYn');

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

interface SwipeableMessageBubbleProps {
  msg: any;
  isMine: boolean;
  showAvatar: boolean;
  isSelected: boolean;
  otherParticipantInfo: any;
  userProfile: any;
  onSelect: (msgId: string | null) => void;
  onSwipeToReply: (msg: any) => void;
  onDeleteInitiate: (msgId: string) => void;
  navigate: (path: string) => void;
}

function SwipeableMessageBubble({
  msg,
  isMine,
  showAvatar,
  isSelected,
  otherParticipantInfo,
  userProfile,
  onSelect,
  onSwipeToReply,
  onDeleteInitiate,
  navigate,
}: SwipeableMessageBubbleProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isThresholdPassed, setIsThresholdPassed] = useState(false);
  const hasVibrated = useRef(false);

  return (
    <div 
      id={`msg-${msg.id}`} 
      className={`flex flex-col w-full transition-all duration-300 origin-center ${isMine ? 'items-end' : 'items-start'}`}
    >
      <div className={`flex w-full relative ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine && (
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mr-2 self-end mb-1">
            {showAvatar ? (
              otherParticipantInfo?.photoURL ? (
                <LazyImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full" />
              ) : (
                <LazyImage src={getDefaultAvatar(otherParticipantInfo?.displayName || 'Usuário', otherParticipantInfo?.username || '')} alt={otherParticipantInfo?.displayName} className="w-full h-full" />
              )
            ) : (
              <div className="w-8 h-8" />
            )}
          </div>
        )}

        <div className={`relative ${isMine ? 'ml-auto' : ''} max-w-[75%]`}>
          {/* Underlay Swipe to Reply Indicator */}
          {!msg.isDeleted && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center transition-all duration-100"
              style={{
                left: '-40px',
                opacity: Math.max(0, Math.min(1, (dragOffset - 15) / 35)),
                transform: `scale(${Math.max(0.6, Math.min(1.2, dragOffset / 50))}) translateY(-50%)`,
                zIndex: 0
              }}
            >
              <div className={`p-1.5 rounded-full transition-colors ${isThresholdPassed ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'}`}>
                <CornerUpLeft className="w-4 h-4" />
              </div>
            </div>
          )}

          <motion.div
            drag={!msg.isDeleted ? "x" : false}
            dragConstraints={{ left: 0, right: 100 }}
            dragElastic={{ left: 0.1, right: 0.3 }}
            dragSnapToOrigin={true}
            onDragStart={() => {
              hasVibrated.current = false;
            }}
            onDrag={(event, info) => {
              const xValue = info.offset.x;
              setDragOffset(xValue);
              if (xValue > 50) {
                if (!hasVibrated.current) {
                  triggerHaptic('light');
                  hasVibrated.current = true;
                }
                setIsThresholdPassed(true);
              } else {
                setIsThresholdPassed(false);
                if (xValue < 30) {
                  hasVibrated.current = false;
                }
              }
            }}
            onDragEnd={(event, info) => {
              setDragOffset(0);
              setIsThresholdPassed(false);
              hasVibrated.current = false;
              if (info.offset.x > 50) {
                triggerHaptic('medium');
                onSwipeToReply(msg);
              }
            }}
            onClick={(e) => {
              if (isMine && !msg.isDeleted) {
                e.stopPropagation();
                onSelect(isSelected ? null : msg.id);
              }
            }}
            className={`w-full rounded-2xl cursor-pointer transition-all ${
              msg.imageUrl && !msg.text 
                ? 'p-0 bg-transparent'
                : 'px-4 py-2 ' + (
                    isMine 
                      ? msg.isDeleted 
                        ? 'bg-gray-100 text-gray-400 italic rounded-br-sm border border-gray-200'
                        : 'bg-blue-500 text-white rounded-br-sm hover:bg-blue-600 shadow-sm' 
                      : msg.isDeleted
                        ? 'bg-gray-50 text-gray-400 italic rounded-bl-sm border border-gray-100'
                        : 'bg-gray-100 text-black rounded-bl-sm shadow-xs'
                  )
            } ${isSelected ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
          >
            {/* Threaded / Replied-To message body in message bubble */}
            {!msg.isDeleted && msg.replyTo && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const parentMsgId = msg.replyTo.id;
                  const targetElement = document.getElementById(`msg-${parentMsgId}`);
                  if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // momentarily flash highlight
                    targetElement.classList.add('bg-blue-50', 'dark:bg-blue-950/40', 'scale-[1.02]', 'ring-2', 'ring-blue-400/20');
                    setTimeout(() => {
                      targetElement.classList.remove('bg-blue-50', 'dark:bg-blue-950/40', 'scale-[1.02]', 'ring-2', 'ring-blue-400/20');
                    }, 1200);
                  }
                }}
                className={`mb-2 p-2 rounded-xl text-left border-l-4 cursor-pointer text-xs flex flex-col space-y-0.5 max-w-full overflow-hidden transition-opacity hover:opacity-90 ${
                  isMine 
                    ? 'bg-blue-600/30 border-blue-200 text-blue-100' 
                    : 'bg-gray-200/60 border-gray-400 text-gray-600 dark:text-gray-300'
                }`}
              >
                <span className="font-extrabold text-[10px] uppercase tracking-wider opacity-90">
                  {msg.replyTo.senderName || 'Usuário'}
                </span>
                <span className="truncate max-w-full opacity-80 font-medium">
                  {msg.replyTo.imageUrl && !msg.replyTo.text ? '📷 Foto' : msg.replyTo.audioUrl ? '🎤 Áudio' : msg.replyTo.text}
                </span>
              </div>
            )}

            {msg.imageUrl && (
              <div className={`${msg.text ? 'mb-2' : ''} max-w-full overflow-hidden rounded-2xl`}>
                 <LazyImage src={msg.imageUrl} alt="Mídia" className={`w-full object-cover max-h-80 ${msg.text ? 'rounded-xl' : 'rounded-2xl shadow-sm'}`} />
              </div>
            )}
            {msg.audioUrl && (
              <div className="py-1 min-w-[200px]">
                <audio src={msg.audioUrl} controls className={`w-full max-h-10 ${isMine ? 'brightness-125 saturate-150' : ''}`} />
              </div>
            )}
            {msg.text && (
              msg.postId ? (
                <div className="space-y-2 cursor-pointer" onClick={() => navigate(`/post/${msg.postId}`)}>
                    <p className={`text-xs font-bold opacity-80 underline ${isMine ? 'text-blue-100' : 'text-blue-600'}`}>Post compartilhado</p>
                    <p className="break-words text-sm font-medium">{msg.text || 'Clique para ver o post'}</p>
                </div>
              ) : (
                <p className="break-words text-sm font-medium">{msg.text}</p>
              )
            )}
            {isMine && !msg.isDeleted && (
              <div className={`flex justify-end mt-1 items-center space-x-1 ${msg.imageUrl && !msg.text ? 'bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full absolute bottom-2 right-2' : ''}`}>
                <span className="text-[10px] opacity-70">
                  {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                {msg.read ? (
                  <CheckCheck className={`w-3 h-3 ${msg.imageUrl && !msg.text ? 'text-white' : 'text-blue-200'}`} />
                ) : (
                  <Check className={`w-3 h-3 ${msg.imageUrl && !msg.text ? 'text-white' : 'text-blue-100'}`} />
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {isSelected && isMine && !msg.isDeleted && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 flex items-center space-x-2"
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDeleteInitiate(msg.id);
            }}
            className="flex items-center space-x-1 text-xs text-red-500 font-semibold bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 px-3 py-1 rounded-full transition-all border border-red-100/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Apagar para todos</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { userProfile, blockUser, unblockUser, sendChatMessage, setTypingStatus } = useAuth();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean, messageId: string }>({ isOpen: false, messageId: '' });
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  
  // Media states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'gifs' | 'stickers'>('gifs');
  const [gifSearch, setGifSearch] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [saveRecording, setSaveRecording] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setSaveRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendAudio = async () => {
    if (!saveRecording || !conversationId || !userProfile?.uid) return;
    
    try {
      setUploadingMedia(true);
      
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(saveRecording);
      });
      
      await sendChatMessage(conversationId, '', undefined, base64Audio);
      setSaveRecording(null);
      setRecordingTime(0);
      setTimeout(scrollToBottom, 500);
    } catch (error) {
      console.error("Error sending audio:", error);
    } finally {
      setUploadingMedia(false);
    }
  };

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
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, `conversations/${conversationId}/messages`);
      }
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
      setTypingStatus(conversationId, true).catch(() => {});
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingStatus(conversationId, false).catch(() => {});
    }, 3000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setShowGifPicker(false);
    }
  };

  const fetchGifs = (offset: number) => {
    if (gifSearch) {
      if (pickerType === 'stickers') {
        return gf.search(gifSearch, { offset, limit: 10, type: 'stickers' });
      }
      return gf.search(gifSearch, { offset, limit: 10 });
    }
    if (pickerType === 'stickers') {
        return gf.trending({ offset, limit: 10, type: 'stickers' });
    }
    return gf.trending({ offset, limit: 10 });
  };

  const handleSendMessage = async (e?: React.FormEvent, mediaUrl?: string) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !mediaUrl && !selectedImage) || !userProfile?.uid || !conversationId || !db || uploadingMedia) return;

    const messageText = newMessage.trim();
    const otherId = conversation.participants.find((id: string) => id !== userProfile.uid);
    
    setNewMessage(''); // Optimistic clear
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setTypingStatus(conversationId, false).catch(() => {});

    try {
      setUploadingMedia(true);
      let finalMediaUrl = mediaUrl || null;
      
      if (selectedImage && !finalMediaUrl) {
         finalMediaUrl = await uploadToImgBB(selectedImage);
      }
      
      let replyPayload = null;
      if (replyingTo) {
        const isMine = replyingTo.senderId === userProfile?.uid;
        const senderName = isMine ? 'Você' : (otherParticipantInfo?.displayName || 'Usuário');
        replyPayload = {
          id: replyingTo.id,
          text: replyingTo.text || '',
          senderId: replyingTo.senderId,
          imageUrl: replyingTo.imageUrl || null,
          audioUrl: replyingTo.audioUrl || null,
          senderName: senderName
        };
      }
      
      await sendChatMessage(conversationId, messageText, finalMediaUrl || undefined, undefined, replyPayload || null);
      
      setReplyingTo(null);
      setSelectedImage(null);
      setImagePreview(null);
      setShowGifPicker(false);
      setGifSearch('');
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteMessage = async () => {
    const { messageId } = deleteConfirmModal;
    if (!conversationId || !db || !messageId) return;
    
    try {
      // Soft delete: mark as deleted
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', messageId), {
        isDeleted: true,
        text: 'Mensagem apagada',
        updatedAt: serverTimestamp()
      });
      setSelectedMessageId(null);
      setDeleteConfirmModal({ isOpen: false, messageId: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando mensagens...</div>;
  }

  const otherParticipantId = conversation?.participants?.find((id: string) => id !== userProfile?.uid);
  const otherParticipantInfo = conversation?.participantInfo?.[otherParticipantId];
  const isBlocked = otherParticipantId && userProfile?.blockedUsers?.includes(otherParticipantId);

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 sm:absolute sm:inset-0">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/messages')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {otherParticipantInfo?.photoURL ? (
                  <LazyImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full" />
                ) : (
                  <LazyImage src={getDefaultAvatar(otherParticipantInfo?.displayName || 'Usuário', otherParticipantInfo?.username || '')} alt={otherParticipantInfo?.displayName} className="w-full h-full" />
                )}
                {otherParticipantInfo?.onlineStatus === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full z-10" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-1">
                  <h2 className="font-bold leading-tight">{otherParticipantInfo?.displayName || 'Usuário'}</h2>
                  {(otherParticipantInfo?.isVerified || otherParticipantInfo?.username === 'Rulio') && <VerifiedBadge tier={otherParticipantInfo?.username === 'Rulio' ? 'black' : otherParticipantInfo?.premiumTier} />}
                  {conversation?.streakCount > 0 && (
                    <div className="flex items-center space-x-0.5 ml-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      <Flame className="w-3 h-3 text-orange-500 fill-current" />
                      <span className="text-[10px] font-black italic text-orange-500">{conversation.streakCount}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                   <p className="text-xs text-gray-500">@{otherParticipantInfo?.username || 'usuario'}</p>
                   {otherParticipantInfo?.onlineStatus === 'online' && (
                     <>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className="text-[10px] font-black text-green-500 uppercase italic">Online</span>
                     </>
                   )}
                </div>
              </div>
            </div>
          </div>
          {/* Call actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 mr-2">
            <button 
              onClick={() => {
                if (otherParticipantId) {
                  startCall(otherParticipantId, 'audio', otherParticipantInfo);
                }
              }}
              className="p-2.5 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors shadow-sm"
              aria-label="Chamada de áudio"
            >
              <Phone className="w-5 h-5 fill-current" />
            </button>
            <button 
              onClick={() => {
                if (otherParticipantId) {
                  startCall(otherParticipantId, 'video', otherParticipantInfo);
                }
              }}
              className="p-2.5 text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors shadow-sm"
              aria-label="Chamada de vídeo"
            >
              <Video className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" onClick={() => setSelectedMessageId(null)}>
        {messages.map((msg, index) => {
          const isMine = msg.senderId === userProfile?.uid;
          const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);
          const isSelected = selectedMessageId === msg.id;
          
          // Data separator logic
          const prevMsg = messages[index - 1];
          const msgDate = msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleDateString() : '';
          const prevDate = prevMsg?.createdAt?.toDate ? new Date(prevMsg.createdAt.toDate()).toLocaleDateString() : '';
          const showDate = index === 0 || msgDate !== prevDate;

          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                  <div className="text-center text-xs text-gray-400 py-2 font-medium">{msgDate}</div>
              )}
              <SwipeableMessageBubble
                msg={msg}
                isMine={isMine}
                showAvatar={showAvatar}
                isSelected={isSelected}
                otherParticipantInfo={otherParticipantInfo}
                userProfile={userProfile}
                onSelect={setSelectedMessageId}
                onSwipeToReply={setReplyingTo}
                onDeleteInitiate={(msgId) => setDeleteConfirmModal({ isOpen: true, messageId: msgId })}
                navigate={(path) => navigate(path)}
              />
            </React.Fragment>
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
      <div className="p-3 border-t border-gray-100 bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] shrink-0 mt-auto relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageChange}
        />

        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-sky-50 dark:bg-sky-950/20 p-3 mb-2 rounded-2xl border border-sky-100 dark:border-sky-900/10 flex items-center justify-between"
            >
              <div className="flex items-center space-x-2 text-left min-w-0 pr-4">
                <div className="pl-2 border-l-2 border-sky-400">
                  <p className="text-xs font-black text-sky-600 dark:text-sky-400 flex items-center space-x-1">
                    <CornerUpLeft className="w-3.5 h-3.5 mr-0.5" />
                    <span>Respondendo a {replyingTo.senderId === userProfile?.uid ? 'Você' : (otherParticipantInfo?.displayName || 'Usuário')}</span>
                  </p>
                  <p className="text-xs text-sky-700/80 dark:text-sky-300/80 truncate font-semibold">
                    {replyingTo.imageUrl && !replyingTo.text ? '📷 Foto' : replyingTo.audioUrl ? '🎤 Áudio' : replyingTo.text}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  setReplyingTo(null);
                }}
                className="p-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-full transition-colors text-sky-500 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {imagePreview && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 p-3 mb-2 rounded-2xl relative overflow-hidden flex justify-center"
            >
              <div className="relative group">
                <img src={imagePreview} alt="Preview" className="h-32 rounded-xl object-cover" />
                <button 
                  onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showGifPicker && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 350, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border border-gray-100 rounded-t-3xl shadow-2xl absolute bottom-full left-0 right-0 z-50 flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-gray-50">
                <div className="flex bg-gray-100 rounded-full p-1 mb-3">
                  <button 
                    onClick={() => setPickerType('gifs')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${pickerType === 'gifs' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                  >
                    GIFs
                  </button>
                  <button 
                    onClick={() => setPickerType('stickers')}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all ${pickerType === 'stickers' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
                  >
                    Figurinhas
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    placeholder={pickerType === 'gifs' ? "Buscar GIFs..." : "Buscar figurinhas..."}
                    className="w-full bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 ring-blue-500/20"
                  />
                  {gifSearch && (
                    <button onClick={() => setGifSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <Grid
                  width={window.innerWidth > 500 ? 460 : window.innerWidth - 32}
                  columns={2}
                  fetchGifs={fetchGifs}
                  key={`${pickerType}-${gifSearch}`}
                  onGifClick={(gif, e) => {
                    e.preventDefault();
                    handleSendMessage(undefined, gif.images.original.url);
                  }}
                  noResultsMessage="Nenhum resultado encontrado"
                />
              </div>
              <div className="p-2 border-t border-gray-50 flex justify-center">
                 <button onClick={() => setShowGifPicker(false)} className="text-sm font-bold text-gray-400 hover:text-black transition-colors py-2 px-4">
                    Fechar
                 </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isBlocked ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <p className="text-sm text-gray-500">Você bloqueou este usuário.</p>
            <button 
              onClick={() => unblockUser(otherParticipantId)}
              className="text-sm font-bold text-red-600 hover:underline"
            >
              Desbloquear para enviar mensagem
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {isRecording ? (
              <div className="flex-1 flex items-center bg-red-50 dark:bg-red-950/20 rounded-full px-4 py-2 border border-red-100 dark:border-red-900/30">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-3" />
                 <span className="flex-grow font-black text-xs text-red-600 dark:text-red-400 tabular-nums">Gravando: {formatTime(recordingTime)}</span>
                 <button 
                   onClick={() => { setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current); if(mediaRecorderRef.current) mediaRecorderRef.current.stop(); setSaveRecording(null); }}
                   className="p-2 text-gray-500 hover:text-red-500 mr-2"
                 >
                   <X className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={stopRecording}
                   className="bg-red-500 text-white p-2 rounded-full shadow-lg"
                 >
                   <Check className="w-4 h-4" />
                 </button>
              </div>
            ) : saveRecording ? (
              <div className="flex-1 flex items-center bg-blue-50 dark:bg-blue-950/20 rounded-full px-4 py-2 border border-blue-100 dark:border-blue-900/30">
                <Mic className="w-4 h-4 text-blue-500 mr-3" />
                <span className="flex-grow font-black text-xs text-blue-600 dark:text-blue-400">Áudio pronto para enviar</span>
                <button 
                  onClick={() => setSaveRecording(null)}
                  className="p-2 text-gray-500 hover:text-red-500 mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleSendAudio}
                  disabled={uploadingMedia}
                  className="bg-blue-500 text-white p-2 rounded-full shadow-lg disabled:opacity-50"
                >
                  {uploadingMedia ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-full px-4 py-1.5 flex-1">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:text-blue-500 rounded-full transition-colors flex-shrink-0"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowGifPicker(!showGifPicker); setPickerType('stickers'); }}
                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${showGifPicker && pickerType === 'stickers' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'}`}
                  >
                    <StickerIcon className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowGifPicker(!showGifPicker); setPickerType('gifs'); }}
                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${showGifPicker && pickerType === 'gifs' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'}`}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center mr-1">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      placeholder="Mensagem..."
                      className="flex-1 bg-transparent outline-none py-2 text-sm mx-2"
                    />
                    {(!newMessage.trim() && !selectedImage && !uploadingMedia) ? (
                      <button 
                        type="button"
                        onClick={startRecording}
                        className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors flex-shrink-0"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    ) : (
                      <button 
                        type="submit" 
                        disabled={uploadingMedia}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-30 flex-shrink-0 relative"
                      >
                        {uploadingMedia ? (
                          <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, messageId: '' })}
        onConfirm={handleDeleteMessage}
        title="Apagar mensagem?"
        message="Deseja realmente apagar esta mensagem para todos? Esta ação é irreversível."
        confirmText="Apagar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
