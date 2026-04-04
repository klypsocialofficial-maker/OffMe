import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Image as ImageIcon, X, BarChart2, Film } from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB } from '../lib/imgbb';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { Grid } from '@giphy/react-components';

const gf = new GiphyFetch('rJC35Qp0ILjTI6mBlDGRcKCNnCucBBYn');

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  handleFirestoreError: (error: unknown, op: any, path: string) => void;
  OperationType: any;
  replyTo?: any;
}

export default function CreatePostModal({ isOpen, onClose, userProfile, handleFirestoreError, OperationType, replyTo }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setGifUrl(null); // Clear GIF if image is uploaded
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    
    if ((!content.trim() && !imageFile && !gifUrl && !hasValidPoll) || !userProfile || !db || content.length > 1000) return;

    try {
      setLoading(true);
      let imageUrl = gifUrl; // Use GIF URL if available
      if (imageFile) {
        imageUrl = await uploadToImgBB(imageFile);
      }

      const postContent = content.trim();
      
      const postData: any = {
        content: postContent,
        imageUrl,
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
        threadId: replyTo?.threadId || replyTo?.id || null
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
      const mentions = postContent.match(/@(\w+)/g);
      const mentionedUsernames = mentions ? [...new Set(mentions.map(m => m.substring(1)))] : [];

      if (mentionedUsernames.length > 0) {
        for (const username of mentionedUsernames) {
          if (username === userProfile.username) continue; // Don't notify self
          
          const userQuery = query(collection(db, 'users'), where('username', '==', username));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const mentionedUserId = userSnapshot.docs[0].id;
            
            await addDoc(collection(db, 'notifications'), {
              recipientId: mentionedUserId,
              senderId: userProfile.uid,
              senderName: userProfile.displayName,
              senderUsername: userProfile.username,
              senderPhoto: userProfile.photoURL || null,
              senderVerified: userProfile.isVerified || userProfile.username === 'Rulio',
              senderPremiumTier: userProfile.premiumTier || null,
              type: 'mention',
              postId: newPostRef.id,
              content: postContent,
              read: false,
              createdAt: serverTimestamp()
            });
          }
        }
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
        }
      }

      setContent('');
      removeImage();
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
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[70vh] max-w-2xl mx-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={onClose} className="text-gray-900 font-medium hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors">
                Cancel
              </button>
              <h2 className="font-bold text-lg">{replyTo ? 'Reply' : 'Novo post'}</h2>
              <div className="w-16"></div> {/* Spacer to center the title */}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex space-x-3">
                {/* Left Column: Avatar and Line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-100">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                  <div className="w-0.5 h-full bg-gray-200 my-2 min-h-[60px]"></div>
                  <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 opacity-50">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-1 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Right Column: Content */}
                <div className="flex-1 pb-8">
                  <div className="flex items-center space-x-1 mb-1">
                    <span className="font-bold text-sm">{userProfile?.username || 'user'}</span>
                    <span className="text-gray-400 text-sm">{'>'} Feed</span>
                  </div>
                  
                  {replyTo && (
                    <div className="mb-2 text-sm text-gray-500 font-medium flex items-center space-x-1">
                      <span>Replying to</span>
                      <span className="text-black">@{replyTo.authorUsername}</span>
                      {(replyTo.authorVerified || replyTo.authorUsername === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5" tier={replyTo.authorPremiumTier} />}
                    </div>
                  )}

                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={replyTo ? "Post your reply" : "What's new?"}
                    className="w-full bg-transparent text-base outline-none resize-none min-h-[60px] placeholder-gray-400"
                    autoFocus
                  />
                  
                  {imagePreview && (
                    <div className="relative mt-2 mb-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
                      <button
                        onClick={removeImage}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100 z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-64 object-cover" />
                    </div>
                  )}

                  {gifUrl && !imagePreview && (
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
                            setImageFile(null);
                            setImagePreview(null);
                            setShowGifPicker(false);
                          }} 
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-gray-400 mb-6 mt-2">
                    <button onClick={() => fileInputRef.current?.click()} className="hover:text-gray-600 transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { setShowPoll(!showPoll); setShowGifPicker(false); }} 
                      className={`hover:text-gray-600 transition-colors ${showPoll ? 'text-blue-500' : ''}`}
                    >
                      <BarChart2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { setShowGifPicker(!showGifPicker); setShowPoll(false); }} 
                      className={`hover:text-gray-600 transition-colors ${showGifPicker ? 'text-blue-500' : ''}`}
                    >
                      <Film className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-gray-300 text-sm font-medium">
                    Add to thread
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <button className="text-gray-500 font-medium text-sm hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors">
                Reply options
              </button>
              
              <div className="flex items-center space-x-4">
                <div className={`text-xs font-medium ${content.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                  {content.length} / 1000
                </div>

                <div className="w-12 h-7 bg-gray-500 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <UserIcon className="w-3 h-3 text-gray-500" />
                  </div>
                </div>

                <button
                  onClick={handlePost}
                  disabled={(!content.trim() && !imageFile && !gifUrl && !(showPoll && pollOptions.filter(o => o.trim()).length >= 2)) || loading || content.length > 1000}
                  className="bg-black text-white px-6 py-2 rounded-full font-bold hover:bg-gray-800 disabled:bg-gray-300 disabled:text-white transition-colors"
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
