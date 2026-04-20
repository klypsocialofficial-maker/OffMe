import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Send, Smile, Image as ImageIcon, Film, X } from 'lucide-react';
import LazyImage from './LazyImage';
import { formatRelativeTime } from '../lib/dateUtils';
import { uploadToImgBB } from '../lib/imgbb';
import { uploadToCloudinary } from '../lib/cloudinary';
import { motion, AnimatePresence } from 'motion/react';

interface CommunityChatProps {
  communityId: string;
}

export default function CommunityChat({ communityId }: CommunityChatProps) {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
    if (!userProfile || (!newMessage.trim() && !selectedImage && !selectedVideo) || !db || uploading) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setUploading(true);

    try {
      let mediaUrl = null;
      let hasVideo = false;

      if (selectedImage) {
        mediaUrl = await uploadToImgBB(selectedImage);
      } else if (selectedVideo) {
        mediaUrl = await uploadToCloudinary(selectedVideo, (progress) => {
          setUploadProgress(progress);
        });
        hasVideo = true;
      }

      await addDoc(collection(db, `communities/${communityId}/messages`), {
        text: messageText,
        mediaUrl,
        hasVideo,
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderUsername: userProfile.username,
        senderPhoto: userProfile.photoURL,
        createdAt: serverTimestamp()
      });

      setSelectedImage(null);
      setImagePreview(null);
      setSelectedVideo(null);
      setVideoPreview(null);
      setUploadProgress(null);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setSelectedVideo(null);
      setVideoPreview(null);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setSelectedImage(null);
      setImagePreview(null);
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
                } ${msg.mediaUrl && !msg.text ? 'p-0 bg-transparent border-none shadow-none' : ''}`}>
                  {msg.mediaUrl && (
                    <div className="mb-2 max-w-full overflow-hidden rounded-xl bg-black/5">
                      {msg.hasVideo ? (
                        <video src={msg.mediaUrl} className="w-full h-full object-contain max-h-[300px]" controls playsInline muted />
                      ) : (
                        <LazyImage src={msg.mediaUrl} alt="Mídia" className="w-full object-cover max-h-[300px]" />
                      )}
                    </div>
                  )}
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-black/5">
        <AnimatePresence>
          {(imagePreview || videoPreview) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-2 pb-3 mb-1"
            >
              <div className="relative inline-block group">
                {imagePreview ? (
                  <img src={imagePreview} className="h-24 w-24 object-cover rounded-xl border-2 border-black/5 shadow-sm" alt="Preview" />
                ) : (
                  <div className="h-24 w-40 bg-black rounded-xl overflow-hidden relative">
                    <video src={videoPreview!} className="h-full w-full object-contain" muted />
                    {uploadProgress !== null && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
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
                )}
                <button 
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setSelectedVideo(null);
                    setVideoPreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full shadow-lg z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input 
            type="file" 
            ref={imageInputRef} 
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

          <div className="flex items-center">
            <button 
              type="button" 
              onClick={() => imageInputRef.current?.click()}
              className={`p-2 transition-colors rounded-full ${imagePreview ? 'text-black bg-black/5' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button 
              type="button" 
              onClick={() => videoInputRef.current?.click()}
              className={`p-2 transition-colors rounded-full ${videoPreview ? 'text-black bg-black/5' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}
            >
              <Film className="w-5 h-5" />
            </button>
          </div>
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
            disabled={(!newMessage.trim() && !selectedImage && !selectedVideo) || uploading}
            className="p-3 bg-black text-white rounded-2xl font-bold shadow-lg shadow-black/10 active:scale-90 transition-all disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
