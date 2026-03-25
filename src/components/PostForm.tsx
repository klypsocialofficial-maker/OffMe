import React, { useState, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { Image as ImageIcon, Smile, Calendar, MapPin, Send, X, MapPinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProfile } from '../hooks/useProfile';
import { imageService } from '../services/imageService';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface Props {
  onSuccess?: () => void;
}

export default function PostForm({ onSuccess }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();
  const user = auth.currentUser;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setContent(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleLocationRequest = () => {
    if (location) {
      setLocation(null);
      return;
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: "Current Location"
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please check permissions.");
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !profile) return;

    setLoading(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await imageService.uploadImage(selectedImage);
      }

      const postData: any = {
        authorUid: user.uid,
        authorName: profile.displayName || 'Anonymous',
        authorUsername: profile.username || 'user',
        content: content.trim(),
        createdAt: serverTimestamp(),
        likesCount: 0,
        repostsCount: 0,
        repliesCount: 0,
        parentPostId: null,
      };

      if (profile.photoURL) {
        postData.authorPhoto = profile.photoURL;
      }

      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }

      if (location) {
        postData.location = location;
      }

      if (scheduledFor) {
        postData.scheduledFor = Timestamp.fromDate(new Date(scheduledFor));
      }

      const docRef = await addDoc(collection(db, 'posts'), postData);
      await updateDoc(docRef, { id: docRef.id });

      // Update user postsCount
      await updateDoc(doc(db, 'users', user.uid), {
        postsCount: increment(1)
      });

      // Reset form
      setContent('');
      setSelectedImage(null);
      setLocation(null);
      setScheduledFor(null);
      setShowScheduler(false);
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating post:', err);
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 border-b border-gray-100 bg-white sm:shadow-sm relative">
      <div className="flex gap-3 sm:gap-4">
        <img
          src={user?.photoURL || 'https://picsum.photos/seed/user/100/100'}
          alt="Profile"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
          referrerPolicy="no-referrer"
        />
        <form onSubmit={handleSubmit} className="flex-1 min-w-0 space-y-4">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full text-lg sm:text-xl font-medium text-black placeholder-gray-300 border-none focus:ring-0 resize-none min-h-[100px] sm:min-h-[120px] bg-transparent p-0 pt-1"
              maxLength={280}
            />
            
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative mt-2 rounded-2xl overflow-hidden group"
                >
                  <img src={selectedImage} alt="Preview" className="w-full max-h-[300px] object-cover" />
                  <button 
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {location && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold mt-2"
                >
                  <MapPin className="w-3 h-3" />
                  {location.name}
                  <button type="button" onClick={() => setLocation(null)}>
                    <X className="w-3 h-3 hover:text-blue-800" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {scheduledFor && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold mt-2 ml-2"
                >
                  <Calendar className="w-3 h-3" />
                  Scheduled: {new Date(scheduledFor).toLocaleString()}
                  <button type="button" onClick={() => setScheduledFor(null)}>
                    <X className="w-3 h-3 hover:text-purple-800" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex items-center gap-1 sm:gap-2 text-gray-400">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="hover:text-black transition-colors p-2 hover:bg-gray-50 rounded-xl"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              
              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="hover:text-black transition-colors p-2 hover:bg-gray-50 rounded-xl"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 z-50 mb-2">
                    <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                    <div className="relative">
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button 
                  type="button" 
                  onClick={() => setShowScheduler(!showScheduler)}
                  className="hover:text-black transition-colors p-2 hover:bg-gray-50 rounded-xl"
                >
                  <Calendar className="w-5 h-5" />
                </button>
                <AnimatePresence>
                  {showScheduler && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 z-50 mb-2 bg-white p-4 rounded-2xl shadow-2xl border border-gray-100 w-[280px]"
                    >
                      <h4 className="text-sm font-black mb-3 tracking-tight">Schedule Post</h4>
                      <input 
                        type="datetime-local" 
                        onChange={(e) => setScheduledFor(e.target.value)}
                        className="w-full p-2 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowScheduler(false)}
                        className="w-full mt-3 py-2 bg-black text-white rounded-xl font-bold text-xs"
                      >
                        Done
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                type="button" 
                onClick={handleLocationRequest}
                className={cn(
                  "transition-all p-2 rounded-xl",
                  location ? "text-blue-500 bg-blue-50" : "text-gray-400 hover:text-black hover:bg-gray-50"
                )}
              >
                {location ? <MapPin className="w-5 h-5" /> : <MapPinOff className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "hidden sm:block text-[10px] font-black tracking-widest uppercase",
                content.length > 250 ? "text-red-500" : "text-gray-300"
              )}>
                {content.length}/280
              </div>
              <button
                type="submit"
                disabled={!content.trim() || loading}
                className="px-5 sm:px-8 py-2 sm:py-3 bg-black text-white rounded-full font-bold text-sm sm:text-base hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl active:scale-95 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{scheduledFor ? 'Schedule' : 'Post'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
