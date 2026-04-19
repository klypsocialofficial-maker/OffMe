import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { doc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { uploadToImgBB } from '../lib/imgbb';

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
      document.body.classList.add('has-modal');
    } else {
      document.body.classList.remove('has-modal');
    }
    return () => {
      document.body.classList.remove('has-modal');
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

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (cropImageSrc) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black">
        <div className="relative w-full flex-1 max-w-2xl">
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
            className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveCrop}
            className="bg-blue-500 text-white px-8 py-3 rounded-full font-bold hover:bg-blue-600 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold">Editar perfil</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={loading || !displayName.trim()}
            className="bg-black text-white px-5 py-1.5 rounded-full font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        <div className="overflow-y-auto">
          {/* Banner */}
          <div className="relative h-32 sm:h-48 bg-gray-200 w-full group">
            <img src={bannerPreview || userProfile?.bannerURL || '/ghost.svg'} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => bannerInputRef.current?.click()}
                className="p-3 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-colors"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={bannerInputRef} onChange={(e) => handleFileChange(e, 'banner')} />
          </div>

          {/* Avatar */}
          <div className="px-4 relative mb-4">
            <div className="absolute -top-16 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm group">
              <img src={avatarPreview || userProfile?.photoURL || '/ghost.svg'} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-colors"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
              <input type="file" accept="image/*" className="hidden" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} />
            </div>
          </div>

          {/* Form */}
          <div className="p-4 pt-20 space-y-6">
            <div className="space-y-1">
              <label className="text-sm text-gray-500 px-1">Nome</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Seu nome"
                maxLength={50}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-gray-500 px-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none min-h-[100px]"
                placeholder="Adicione uma biografia ao seu perfil"
                maxLength={160}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-500 px-1">Localização</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Sua localização"
                maxLength={30}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-500 px-1">Site</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Seu site"
                maxLength={100}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-500 px-1">Categoria</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Ex: Artist, Designer, Developer"
                maxLength={30}
              />
            </div>

            <div className="space-y-3 pb-8">
              <label className="text-sm font-bold text-gray-500 px-1">Tema do Perfil</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'default', name: 'Padrão', class: 'bg-white border-gray-200' },
                  { id: 'minimal', name: 'Mínimo', class: 'bg-gray-50 border-gray-100' },
                  { id: 'vibrant', name: 'Vibrante', class: 'bg-gradient-to-br from-pink-500 to-orange-400' },
                  { id: 'neon', name: 'Neon', class: 'bg-black border-purple-500' }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setProfileTheme(theme.id)}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center space-y-2 ${
                      profileTheme === theme.id 
                        ? 'border-blue-500 shadow-md scale-[1.02]' 
                        : 'border-transparent hover:border-gray-200 grayscale-[0.5]'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full border-2 border-white ${theme.class}`} />
                    <span className="text-xs font-bold">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
