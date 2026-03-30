import React, { useState, useRef } from 'react';
import { User as UserIcon, Image as ImageIcon, X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB } from '../lib/imgbb';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  handleFirestoreError: (error: unknown, op: any, path: string) => void;
  OperationType: any;
}

export default function CreatePostModal({ isOpen, onClose, userProfile, handleFirestoreError, OperationType }: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
        authorPhoto: userProfile.photoURL,
        createdAt: serverTimestamp(),
        likesCount: 0,
        repliesCount: 0
      });
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-20 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={handlePost}
            disabled={(!content.trim() && !imageFile) || loading}
            className="bg-black text-white px-5 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Postando...' : 'Postar'}
          </button>
        </div>
        <div className="p-4 flex space-x-4 overflow-y-auto">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-2 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que está acontecendo?"
              className="w-full bg-transparent text-xl outline-none resize-none min-h-[120px] placeholder-gray-500"
              autoFocus
            />
            {imagePreview && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-gray-200">
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-80 object-cover" />
              </div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex items-center text-blue-500">
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
            className="p-2 hover:bg-blue-50 rounded-full transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
