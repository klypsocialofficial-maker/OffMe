import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image as ImageIcon, User as UserIcon, Trash2, Check, CheckCheck, Phone, Video, PhoneIncoming, Mic, Flame, X, Smile, Sticker as StickerIcon, Film } from 'lucide-react';
import { sendPushNotification } from '../lib/notifications';
import VerifiedBadge from '../components/VerifiedBadge';
import LazyImage from '../components/LazyImage';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultAvatar } from '../lib/avatar';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, writeBatch, increment, limit, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import CallOverlay from '../components/CallOverlay';
import ConfirmModal from '../components/ConfirmModal';
import { uploadToImgBB } from '../lib/imgbb';
import { uploadToCloudinary } from '../lib/cloudinary';
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

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { userProfile, blockUser, unblockUser, sendChatMessage, setTypingStatus } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState<any>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean, messageId: string }>({ isOpen: false, messageId: '' });
  const [activeCall, setActiveCall] = useState<{
    id?: string;
    type: 'audio' | 'video';
    isIncoming: boolean;
    callerId: string;
  } | null>(null);
  
  // Media states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'gifs' | 'stickers'>('gifs');
  const [gifSearch, setGifSearch] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!conversationId || !db || !userProfile?.uid) return;

    const q = query(
      collection(db, 'conversations', conversationId, 'calls'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = callDoc.data();
        
        // If it's a ringing call and we are the callee
        if (callData.status === 'calling' && callData.calleeId === userProfile.uid) {
          setActiveCall({
            id: callDoc.id,
            type: callData.type,
            isIncoming: true,
            callerId: callData.callerId
          });
        } else if (callData.status === 'ended' && activeCall?.id === callDoc.id) {
          setActiveCall(null);
        }
      }
    });

    return unsubscribe;
  }, [conversationId, userProfile?.uid, activeCall?.id]);

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
      setSelectedVideo(null);
      setVideoPreview(null);
      setShowGifPicker(false);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setSelectedImage(null);
      setImagePreview(null);
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
    if ((!newMessage.trim() && !mediaUrl && !selectedImage && !selectedVideo) || !userProfile?.uid || !conversationId || !db || uploadingMedia) return;

    const messageText = newMessage.trim();
    const otherId = conversation.participants.find((id: string) => id !== userProfile.uid);
    
    setNewMessage(''); // Optimistic clear
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    setTypingStatus(conversationId, false).catch(() => {});

    try {
      setUploadingMedia(true);
      let finalMediaUrl = mediaUrl || null;
      let hasVideo = false;
      
      if (selectedImage && !finalMediaUrl) {
         finalMediaUrl = await uploadToImgBB(selectedImage);
      } else if (selectedVideo && !finalMediaUrl) {
         finalMediaUrl = await uploadToCloudinary(selectedVideo, (progress) => {
           setUploadProgress(progress);
         });
         hasVideo = true;
      }
      
      await sendChatMessage(conversationId, otherId, messageText, finalMediaUrl || undefined, hasVideo);
      
      setSelectedImage(null);
      setImagePreview(null);
      setSelectedVideo(null);
      setVideoPreview(null);
      setUploadProgress(null);
      setShowGifPicker(false);
      setGifSearch('');
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${conversationId}/messages`);
    } finally {
      setUploadingMedia(false);
      setUploadProgress(null);
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
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {otherParticipantInfo?.photoURL ? (
                  <LazyImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full" />
                ) : (
                  <LazyImage src={getDefaultAvatar(otherParticipantInfo?.displayName || 'Usuário', otherParticipantInfo?.username || '')} alt={otherParticipantInfo?.displayName} className="w-full h-full" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-1">
                  <h2 className="font-bold leading-tight">{otherParticipantInfo?.displayName || 'Usuário'}</h2>
                  {(otherParticipantInfo?.isVerified || otherParticipantInfo?.username === 'Rulio') && <VerifiedBadge tier={otherParticipantInfo?.premiumTier} />}
                  {conversation?.streakCount > 0 && (
                    <div className="flex items-center space-x-0.5 ml-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      <Flame className="w-3 h-3 text-orange-500 fill-current" />
                      <span className="text-[10px] font-black italic text-orange-500">{conversation.streakCount}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">@{otherParticipantInfo?.username || 'usuario'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => !isBlocked && setActiveCall({ type: 'audio', isIncoming: false, callerId: userProfile?.uid || '' })}
              disabled={isBlocked}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-30"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button 
              onClick={() => !isBlocked && setActiveCall({ type: 'video', isIncoming: false, callerId: userProfile?.uid || '' })}
              disabled={isBlocked}
              className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-30"
            >
              <Video className="w-5 h-5" />
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

          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              <div className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mr-2 self-end mb-1">
                    {showAvatar ? (
                      otherParticipantInfo?.photoURL ? (
                        <LazyImage src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full" />
                      ) : (
                        <LazyImage src={getDefaultAvatar(otherParticipantInfo?.displayName || 'Usuário', otherParticipantInfo?.username || '')} alt={otherParticipantInfo?.displayName} className="w-full h-full" />
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
                  className={`max-w-[75%] rounded-2xl cursor-pointer transition-all ${
                    (msg.imageUrl || msg.hasVideo) && !msg.text 
                      ? 'p-0 bg-transparent' // Media only: no bubble
                      : 'px-4 py-2 ' + (
                          isMine 
                            ? msg.isDeleted 
                              ? 'bg-gray-100 text-gray-400 italic rounded-br-sm border border-gray-200'
                              : 'bg-blue-500 text-white rounded-br-sm hover:bg-blue-600' 
                            : msg.isDeleted
                              ? 'bg-gray-50 text-gray-400 italic rounded-bl-sm border border-gray-100'
                              : 'bg-gray-100 text-black rounded-bl-sm'
                        )
                  } ${isSelected ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
                >
                  {msg.hasVideo && msg.imageUrl && (
                    <div className={`${msg.text ? 'mb-2' : ''} max-w-full overflow-hidden rounded-2xl bg-black aspect-video`}>
                       <video src={msg.imageUrl} className="w-full h-full object-contain" controls playsInline muted />
                    </div>
                  )}
                  {!msg.hasVideo && msg.imageUrl && (
                    <div className={`${msg.text ? 'mb-2' : ''} max-w-full overflow-hidden rounded-2xl`}>
                       <LazyImage src={msg.imageUrl} alt="Mídia" className={`w-full object-cover max-h-80 ${msg.text ? 'rounded-xl' : 'rounded-2xl shadow-sm'}`} />
                    </div>
                  )}
                  {msg.text && (
                    msg.postId ? (
                      <div className="space-y-2 cursor-pointer" onClick={() => navigate(`/post/${msg.postId}`)}>
                          <p className="text-xs font-bold opacity-80 underline">Post compartilhado</p>
                          <p className="break-words text-sm font-medium">{msg.text || 'Clique para ver o post'}</p>
                      </div>
                    ) : (
                      <p className="break-words text-sm">{msg.text}</p>
                    )
                  )}
                  {isMine && !msg.isDeleted && (
                    <div className={`flex justify-end mt-1 items-center space-x-1 ${(msg.imageUrl || msg.hasVideo) && !msg.text ? 'bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full absolute bottom-2 right-2' : ''}`}>
                      <span className="text-[10px] opacity-70">
                        {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                      {msg.read ? (
                        <CheckCheck className={`w-3 h-3 ${(msg.imageUrl || msg.hasVideo) && !msg.text ? 'text-white' : 'text-blue-200'}`} />
                      ) : (
                        <Check className={`w-3 h-3 ${(msg.imageUrl || msg.hasVideo) && !msg.text ? 'text-white' : 'text-blue-100'}`} />
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
                      setDeleteConfirmModal({ isOpen: true, messageId: msg.id });
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
      <div className="p-3 border-t border-gray-100 bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] shrink-0 mt-auto relative">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleImageChange}
        />

         <input 
          type="file" 
          ref={videoInputRef} 
          className="hidden" 
          accept="video/*" 
          onChange={handleVideoChange}
        />

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

          {videoPreview && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 p-3 mb-2 rounded-2xl relative overflow-hidden flex justify-center"
            >
              <div className="relative group aspect-video h-32 bg-black rounded-xl overflow-hidden">
                <video src={videoPreview} className="h-full object-contain" muted />
                <button 
                  onClick={() => { setSelectedVideo(null); setVideoPreview(null); }}
                  className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full shadow-lg z-10"
                >
                  <X className="w-3 h-3" />
                </button>
                {uploadProgress !== null && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                    <span className="text-white text-[10px] font-black">{uploadProgress}%</span>
                    <div className="w-12 h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-blue-500"
                      />
                    </div>
                  </div>
                )}
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
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-1.5 flex-1">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${imagePreview ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'}`}
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                type="button" 
                onClick={() => videoInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${videoPreview ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'}`}
              >
                <Film className="w-5 h-5" />
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
              <form onSubmit={handleSendMessage} className="flex-1 flex items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Mensagem..."
                  className="flex-1 bg-transparent outline-none py-2 text-sm ml-2"
                />
                <button 
                  type="submit" 
                  disabled={(!newMessage.trim() && !selectedImage && !selectedVideo) || uploadingMedia}
                  className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-30 flex-shrink-0 relative"
                >
                  {uploadingMedia ? (
                    <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
            <button className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {activeCall && conversationId && userProfile?.uid && otherParticipantId && (
        <CallOverlay
          conversationId={conversationId}
          currentUserId={userProfile.uid}
          otherUserId={otherParticipantId}
          otherUserName={otherParticipantInfo?.displayName || 'Usuário'}
          otherUserPhoto={otherParticipantInfo?.photoURL || null}
          callType={activeCall.type}
          isIncoming={activeCall.isIncoming}
          callDocId={activeCall.id}
          onEndCall={() => setActiveCall(null)}
        />
      )}

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
