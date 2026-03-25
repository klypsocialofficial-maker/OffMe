import React, { useState, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType, updateProfile, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { X, Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { imageService } from '../services/imageService';
import ImageCropper from './ImageCropper';

interface Props {
  profile: UserProfile;
  onClose: () => void;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export default function EditProfileModal({ profile, onClose, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio || '');
  const [username, setUsername] = useState(profile.username);
  const [photoURL, setPhotoURL] = useState(profile.photoURL || '');
  const [bannerURL, setBannerURL] = useState(profile.bannerURL || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cropping states
  const [cropImage, setCropImage] = useState<{ url: string; type: 'avatar' | 'banner' } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImage({ url: reader.result as string, type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!cropImage || !auth.currentUser) return;
    
    setLoading(true);
    const type = cropImage.type;
    setCropImage(null);

    try {
      const url = await imageService.uploadImage(blob);
      
      if (type === 'avatar') {
        setPhotoURL(url);
      } else {
        setBannerURL(url);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);

    try {
      // Validate username if changed
      if (username !== profile.username) {
        if (username.length < 3) throw new Error('Username too short');
        if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }
        
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) throw new Error('Username already taken');
      }

      const userRef = doc(db, 'users', profile.uid);
      const updatedData = {
        displayName,
        bio,
        username: username.toLowerCase(),
        photoURL,
        bannerURL
      };

      await updateDoc(userRef, updatedData);
      
      // Also update Firebase Auth profile if display name or photo changed
      if (displayName !== profile.displayName || photoURL !== profile.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL
        });
      }

      onUpdate({ ...profile, ...updatedData });
      onClose();
    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to update profile');
      handleFirestoreError(err, OperationType.UPDATE, 'users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-black tracking-tight">Edit Profile</h2>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                {error}
              </div>
            )}

            {/* Banner Upload */}
            <div 
              className="h-32 bg-gray-100 rounded-2xl relative mb-16 group cursor-pointer overflow-hidden"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerURL ? (
                <img src={bannerURL} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <input
                type="file"
                ref={bannerInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'banner')}
              />

              {/* Avatar Upload */}
              <div 
                className="absolute -bottom-12 left-6 p-1 bg-white rounded-full shadow-lg group/avatar cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  avatarInputRef.current?.click();
                }}
              >
                <div className="relative">
                  <img
                    src={photoURL || 'https://picsum.photos/seed/user/200/200'}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white"
                  />
                  <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'avatar')}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-2">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black outline-none transition-all font-medium resize-none"
                />
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {cropImage && (
          <ImageCropper
            image={cropImage.url}
            aspect={cropImage.type === 'avatar' ? 1 : 16 / 9}
            title={`Crop ${cropImage.type === 'avatar' ? 'Profile Photo' : 'Header Banner'}`}
            onCropComplete={handleCropComplete}
            onCancel={() => setCropImage(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
