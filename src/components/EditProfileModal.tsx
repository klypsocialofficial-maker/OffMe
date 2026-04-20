import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Check, Loader2, MapPin, Link as LinkIcon, Info, Palette, Star } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { doc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB } from '../lib/imgbb';
import { motion, AnimatePresence } from 'motion/react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  handleFirestoreError: (error: unknown, op: any, path: string) => void;
  OperationType: any;
}

export default function EditProfileModal({ isOpen, onClose, userProfile, handleFirestoreError, OperationType }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [location, setLocation] = useState(userProfile?.location || '');
  const [website, setWebsite] = useState(userProfile?.website || '');
  const [category, setCategory] = useState(userProfile?.category || '');
  const [profileTheme, setProfileTheme] = useState(userProfile?.profileTheme || 'default');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'avatar' | 'banner' | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<File> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg');
    });
  };

  const handleSaveCrop = async () => {
    if (!cropImageSrc || !croppedAreaPixels || !cropType) return;
    try {
      const croppedImage = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedImage);
      
      if (cropType === 'avatar') {
        setAvatarFile(croppedImage);
        setAvatarPreview(previewUrl);
      } else {
        setBannerFile(croppedImage);
        setBannerPreview(previewUrl);
      }
      setCropImageSrc(null);
      setCropType(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result as string);
        setCropType(type);
      });
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSave = async () => {
    if (!db || !userProfile) return;
    try {
      setLoading(true);
      
      let newAvatarUrl = userProfile.photoURL || '';
      let newBannerUrl = userProfile.bannerURL || '';

      if (avatarFile) {
        newAvatarUrl = await uploadToImgBB(avatarFile);
      }
      if (bannerFile) {
        newBannerUrl = await uploadToImgBB(bannerFile);
      }

      const newDisplayName = displayName.trim();

      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName: newDisplayName,
        bio: bio.trim(),
        location: location.trim(),
        website: website.trim(),
        category: category.trim(),
        profileTheme,
        photoURL: newAvatarUrl,
        bannerURL: newBannerUrl,
        updatedAt: serverTimestamp(),
      });

      // Update all posts by this user
      const postsQuery = query(collection(db, 'posts'), where('authorId', '==', userProfile.uid));
      const postsSnapshot = await getDocs(postsQuery);
      
      // Update all notifications sent by this user
      const notifsQuery = query(collection(db, 'notifications'), where('senderId', '==', userProfile.uid));
      const notifsSnapshot = await getDocs(notifsQuery);

      // Update conversations
      const convsQuery = query(collection(db, 'conversations'), where('participants', 'array-contains', userProfile.uid));
      const convsSnapshot = await getDocs(convsQuery);

      const allDocs = [...postsSnapshot.docs, ...notifsSnapshot.docs, ...convsSnapshot.docs];
      
      // Chunk into batches of 500 (Firestore limit)
      if (allDocs.length > 0) {
        for (let i = 0; i < allDocs.length; i += 500) {
          const batch = writeBatch(db);
          const chunk = allDocs.slice(i, i + 500);
          
          chunk.forEach(docSnap => {
            if (docSnap.ref.path.includes('posts/')) {
              batch.update(docSnap.ref, {
                authorName: newDisplayName,
                authorPhoto: newAvatarUrl
              });
            } else if (docSnap.ref.path.includes('notifications/')) {
              batch.update(docSnap.ref, {
                senderName: newDisplayName,
                senderPhoto: newAvatarUrl
              });
            } else if (docSnap.ref.path.includes('conversations/')) {
              batch.update(docSnap.ref, {
                [`participantInfo.${userProfile.uid}.displayName`]: newDisplayName,
                [`participantInfo.${userProfile.uid}.photoURL`]: newAvatarUrl
              });
            }
          });
          
          await batch.commit();
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (cropImageSrc) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      >
        <div className="relative w-full flex-1 max-w-2xl px-4">
          <Cropper
            image={cropImageSrc}
            crop={crop}
            zoom={zoom}
            aspect={cropType === 'avatar' ? 1 : 3}
            cropShape={cropType === 'avatar' ? 'round' : 'rect'}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        <div className="w-full p-6 bg-black flex justify-center space-x-4 z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={() => { setCropImageSrc(null); setCropType(null); }}
            className="px-8 py-3 rounded-2xl font-bold text-white hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveCrop}
            className="bg-white text-black px-8 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative"
        >
          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black italic tracking-tighter">Perfil Atualizado!</h3>
            </motion.div>
          )}

          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
            <div className="flex items-center space-x-4">
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-90">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-black italic tracking-tighter">Editar Perfil</h2>
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !displayName.trim() || saveSuccess}
              className="bg-black text-white px-6 py-2 rounded-2xl font-bold text-sm hover:translate-y-[-2px] transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 relative min-w-[100px] flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Salvar'
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
            {/* Images Section */}
            <div className="relative">
              <div className="h-32 sm:h-48 bg-slate-100 relative group overflow-hidden">
                <img 
                  src={bannerPreview || userProfile?.bannerURL || `https://picsum.photos/seed/${userProfile?.uid}/800/400`} 
                  alt="Banner" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-100 group-hover:bg-black/40 transition-all">
                  <button 
                    onClick={() => bannerInputRef.current?.click()}
                    className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-xl border border-white/30 transition-all shadow-xl"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </div>
                <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} />
              </div>

              <div className="px-6 relative">
                <div className="absolute -top-12 w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] border-[6px] border-white bg-white overflow-hidden shadow-2xl shadow-black/10 group">
                  <img 
                    src={avatarPreview || userProfile?.photoURL || `https://avatar.vercel.sh/${userProfile?.username || 'user'}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-100 group-hover:bg-black/40 transition-all">
                    <button 
                      onClick={() => avatarInputRef.current?.click()}
                      className="p-2 sm:p-3 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-xl border border-white/30 transition-all"
                    >
                      <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                  <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} />
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="px-6 pt-16 sm:pt-24 space-y-8">
              <div className="space-y-6">
                <div className="relative group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1 flex items-center space-x-2">
                    <Info className="w-3 h-3" />
                    <span>Nome de Exibição</span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-black/5 focus:ring-0 transition-all font-bold"
                    placeholder="Seu nome"
                    maxLength={50}
                  />
                </div>
                
                <div className="relative group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1 flex items-center space-x-2">
                    <Info className="w-3 h-3" />
                    <span>Bio</span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-black/5 focus:ring-0 transition-all font-medium resize-none min-h-[100px] leading-relaxed"
                    placeholder="Conte um pouco sobre você..."
                    maxLength={160}
                  />
                  <div className="absolute bottom-2 right-4 text-[10px] font-bold text-gray-300">
                    {bio.length}/160
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1 flex items-center space-x-2">
                      <MapPin className="w-3 h-3" />
                      <span>Localização</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-black/5 transition-all font-bold text-sm"
                      placeholder="Cidade, País"
                      maxLength={30}
                    />
                  </div>

                  <div className="relative group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1 flex items-center space-x-2">
                      <LinkIcon className="w-3 h-3" />
                      <span>Site</span>
                    </label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-black/5 transition-all font-bold text-sm"
                      placeholder="https://seu-site.com"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="relative group">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 ml-1 flex items-center space-x-2">
                    <Info className="w-3 h-3" />
                    <span>Categoria</span>
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl px-4 py-3 outline-none focus:bg-white focus:border-black/5 transition-all font-bold text-sm"
                    placeholder="Ex: Artista, Desenvolvedor, Gamer"
                    maxLength={30}
                  />
                </div>
              </div>

              {/* Theme Section */}
              <div className="space-y-4 pb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 ml-1 flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span>Personalização do Perfil</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'default', name: 'Original', class: 'bg-white border-black/5', isPremium: false },
                    { id: 'minimal', name: 'Nuvem', class: 'bg-blue-50/50 border-blue-100', isPremium: false },
                    { id: 'vibrant', name: 'Crepúsculo', class: 'bg-gradient-to-br from-indigo-500 to-purple-400', isPremium: true },
                    { id: 'neon', name: 'Cyber', class: 'bg-stone-900 border-stone-800', isPremium: true },
                    { id: 'criador', name: 'Criador', class: 'bg-gradient-to-r from-emerald-500 to-yellow-500', isPremium: true }
                  ].map((theme) => {
                    const isLocked = theme.isPremium && userProfile?.premiumTier !== 'gold';
                    return (
                      <button
                        key={theme.id}
                        disabled={isLocked}
                        onClick={() => setProfileTheme(theme.id)}
                        className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col items-center space-y-3 relative group overflow-hidden ${
                          profileTheme === theme.id 
                            ? 'border-black bg-slate-50 shadow-xl shadow-black/5' 
                            : 'border-transparent bg-slate-50/50 hover:bg-slate-100'
                        } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-2xl border-2 border-white shadow-sm flex-shrink-0 ${theme.class}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-1">
                          {theme.name}
                          {isLocked && <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />}
                        </span>
                        {profileTheme === theme.id && (
                          <motion.div 
                            layoutId="active-theme"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-black"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
