import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, Image as ImageIcon, X } from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB } from '../lib/imgbb';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';

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
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !imageFile) || !userProfile || !db) return;

    try {
      setLoading(true);
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadToImgBB(imageFile);
      }

      await addDoc(collection(db, 'posts'), {
        content: content.trim(),
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
      });

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
            postId: replyTo.id,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }

      setContent('');
      removeImage();
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
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[32px] shadow-2xl overflow-hidden flex flex-col h-[60vh] sm:h-[50vh] max-w-2xl mx-auto"
          >
            {/* Handle bar for visual cue */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handlePost}
                disabled={(!content.trim() && !imageFile) || loading}
                className="bg-black text-white px-6 py-2 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg shadow-black/10"
              >
                {loading ? 'Postando...' : (replyTo ? 'Responder' : 'Postar')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex space-x-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  {replyTo && (
                    <div className="mb-2 text-sm text-gray-500 font-medium flex items-center space-x-1">
                      <span>Respondendo a</span>
                      <span className="text-black">@{replyTo.authorUsername}</span>
                      {(replyTo.authorVerified || replyTo.authorUsername === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5 text-black" />}
                    </div>
                  )}
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={replyTo ? "Poste sua resposta" : "O que está acontecendo?"}
                    className="w-full bg-transparent text-xl outline-none resize-none min-h-[150px] placeholder-gray-400"
                    autoFocus
                  />
                  {imagePreview && (
                    <div className="relative mt-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm group">
                      <button
                        onClick={removeImage}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-64 object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center bg-gray-50/50">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 hover:bg-black/5 text-black rounded-full transition-all hover:scale-110 active:scale-95"
                title="Adicionar imagem"
              >
                <ImageIcon className="w-6 h-6" />
              </button>
              
              <div className="ml-auto text-xs text-gray-400 font-medium">
                {content.length} / 280
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
