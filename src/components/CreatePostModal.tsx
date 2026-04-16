import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Image as ImageIcon, X, BarChart2, Film } from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB } from '../lib/imgbb';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';
import { handleMentions, sendPushNotification, notifyFollowers } from '../lib/notifications';

const gf = new GiphyFetch('rJC35Qp0ILjTI6mBlDGRcKCNnCucBBYn');

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  handleFirestoreError: (error: unknown, op: any, path: string) => void;
  OperationType: any;
  replyTo?: any;
  quotePost?: any;
}

export default function CreatePostModal({ isOpen, onClose, userProfile, handleFirestoreError, OperationType, replyTo, quotePost }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll state
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // GIF state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifUrl, setGifUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (imageFiles.length + newFiles.length > 4) {
        alert('Você pode adicionar no máximo 4 imagens.');
        return;
      }
      setImageFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newFiles.map(file => URL.createObjectURL(file as Blob))]);
      setGifUrl(null); // Clear GIF if image is uploaded
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeGif = () => {
    setGifUrl(null);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('has-modal');
    } else {
      document.body.classList.remove('has-modal');
    }
    return () => {
      document.body.classList.remove('has-modal');
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const handleAddPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      const newOptions = pollOptions.filter((_, i) => i !== index);
      setPollOptions(newOptions);
    }
  };

  const fetchGifs = (offset: number) => {
    if (gifSearch) {
      return gf.search(gifSearch, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validPollOptions = pollOptions.filter(opt => opt.trim() !== '');
    const hasValidPoll = showPoll && validPollOptions.length >= 2;
    
    if ((!content.trim() && imageFiles.length === 0 && !gifUrl && !hasValidPoll) || !userProfile || !db || content.length > 1000) return;

    try {
      setLoading(true);
      let imageUrls = gifUrl ? [gifUrl] : []; // Use GIF URL if available
      if (imageFiles.length > 0) {
        const uploadedUrls = await Promise.all(imageFiles.map(file => uploadToImgBB(file)));
        imageUrls = uploadedUrls;
      }

      const postContent = content.trim();
      
      const postData: any = {
        content: postContent,
        imageUrls,
        authorId: userProfile.uid,
        authorName: userProfile.displayName || '',
        authorUsername: userProfile.username || '',
        authorPhoto: userProfile.photoURL || '',
        authorVerified: userProfile.isVerified || userProfile.username === 'Rulio' || false,
        createdAt: serverTimestamp(),
        likesCount: 0,
        repliesCount: 0,
        repostsCount: 0,
        likes: [],
        reposts: [],
        replyToId: replyTo?.id || null,
        replyToUsername: replyTo?.authorUsername || null,
        replyToVerified: replyTo?.authorVerified || replyTo?.authorUsername === 'Rulio' || false,
        threadId: replyTo?.threadId || replyTo?.id || null,
        quotedPostId: quotePost?.id || null,
        quotedPostContent: quotePost?.content || null,
        quotedPostAuthor: quotePost?.authorName || null
      };

      if (hasValidPoll) {
        postData.poll = {
          options: validPollOptions.map(opt => ({ text: opt, votes: 0 })),
          totalVotes: 0,
          voters: []
        };
      }

      const newPostRef = await addDoc(collection(db, 'posts'), postData);

      // Handle mentions
      await handleMentions(postContent, newPostRef.id, userProfile, imageUrls[0] || null);

      // Notify followers about new post (if not a reply)
      if (!replyTo) {
        await notifyFollowers(userProfile, postContent, imageUrls[0] || null);
      }

      if (replyTo) {
        await updateDoc(doc(db, 'posts', replyTo.id), {
          repliesCount: increment(1)
        });
        
        if (replyTo.authorId !== userProfile.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: replyTo.authorId,
            senderId: userProfile.uid,
            senderName: userProfile.displayName,
            senderUsername: userProfile.username,
            senderPhoto: userProfile.photoURL || null,
            senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
            type: 'reply',
            postId: newPostRef.id,
            content: postContent,
            read: false,
            createdAt: serverTimestamp()
          });

          // Trigger push notification for reply
          await sendPushNotification(
            replyTo.authorId,
            'Nova Resposta',
            `@${userProfile.username} respondeu ao seu post.`
          );
        }
      }

      setContent('');
      setImageFiles([]);
      setImagePreviews([]);
      removeGif();
      setShowPoll(false);
      setPollOptions(['', '']);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setLoading(false);
    }
  };

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      // Simple heuristic for keyboard detection
      const isKeyboard = window.innerHeight < window.screen.height * 0.75;
      setIsKeyboardVisible(isKeyboard);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-[70] bg-white sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:h-[80vh] sm:max-h-[600px] sm:max-w-2xl sm:mx-auto sm:my-auto ${isKeyboardVisible ? 'sm:top-0' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10 pt-[env(safe-area-inset-top)]">
              <button 
                onClick={onClose} 
                className="text-blue-500 font-medium text-base"
              >
                Cancel
              </button>
              <h2 className="font-bold text-base text-gray-900 absolute left-1/2 -translate-x-1/2">
                {replyTo ? 'Responder' : 'Novo post'}
              </h2>
              <button
                onClick={handlePost}
                disabled={(!content.trim() && imageFiles.length === 0 && !gifUrl && !(showPoll && pollOptions.filter(o => o.trim()).length >= 2)) || loading || content.length > 1000}
                className="bg-blue-500 text-white px-4 py-1.5 rounded-full font-bold hover:bg-blue-600 disabled:bg-blue-300 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? 'Postando...' : 'Post'}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex space-x-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={replyTo ? "Postar sua resposta" : "What's up?"}
                    className="w-full bg-transparent text-xl outline-none resize-none min-h-[120px] placeholder-gray-500"
                    autoFocus
                  />
                  
                  {imagePreviews.length > 0 && (
                    <div className={`grid gap-2 mt-2 mb-4 ${imagePreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm group aspect-square">
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100 z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {gifUrl && imagePreviews.length === 0 && (
                    <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
                      <button
                        onClick={removeGif}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100 z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <img src={gifUrl} alt="GIF" className="w-full h-auto max-h-64 object-cover" />
                    </div>
                  )}

                  {/* Poll & GIF Picker */}
                  {showPoll && (
                    <div className="mt-4 mb-4 border border-gray-200 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-sm">Enquete</h4>
                        <button onClick={() => { setShowPoll(false); setPollOptions(['', '']); }} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {pollOptions.map((opt, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handlePollOptionChange(index, e.target.value)}
                              placeholder={`Opção ${index + 1}`}
                              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                              maxLength={25}
                            />
                            {pollOptions.length > 2 && (
                              <button onClick={() => handleRemovePollOption(index)} className="p-2 text-gray-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {pollOptions.length < 4 && (
                        <button 
                          onClick={handleAddPollOption}
                          className="mt-3 text-sm font-bold text-blue-500 hover:text-blue-600"
                        >
                          + Adicionar opção
                        </button>
                      )}
                    </div>
                  )}

                  {showGifPicker && (
                    <div className="mt-4 mb-4 border border-gray-200 rounded-2xl p-4 h-64 flex flex-col">
                      <div className="flex justify-between items-center mb-3">
                        <input
                          type="text"
                          placeholder="Pesquisar GIFs..."
                          value={gifSearch}
                          onChange={(e) => setGifSearch(e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-black mr-2"
                        />
                        <button onClick={() => setShowGifPicker(false)} className="text-gray-400 hover:text-red-500 p-2">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto rounded-xl">
                        <Grid 
                          width={300} 
                          columns={2} 
                          fetchGifs={fetchGifs} 
                          key={gifSearch} // Force re-render on search change
                          onGifClick={(gif, e) => {
                            e.preventDefault();
                            setGifUrl(gif.images.original.url);
                            setImageFiles([]);
                            setImagePreviews([]);
                            setShowGifPicker(false);
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center space-x-2">
                <button onClick={() => fileInputRef.current?.click()} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setShowPoll(!showPoll); setShowGifPicker(false); }} 
                  className={`p-2 rounded-full transition-colors ${showPoll ? 'bg-blue-50 text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                  <BarChart2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { setShowGifPicker(!showGifPicker); setShowPoll(false); }} 
                  className={`p-2 rounded-full transition-colors ${showGifPicker ? 'bg-blue-50 text-blue-500' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                  <Film className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className={`text-xs font-medium ${content.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                  {content.length} / 1000
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
