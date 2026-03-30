import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import EditProfileModal from '../components/EditProfileModal';
import { auth } from '../firebase';

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

export default function Profile() {
  const { userProfile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!userProfile) return null;

  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50">
        <h1 className="text-xl font-bold">{userProfile.displayName}</h1>
        <p className="text-xs text-gray-500">0 posts</p>
      </div>
      
      {/* Cover Photo */}
      <div className="h-32 sm:h-48 bg-gray-200 w-full relative">
        {(userProfile as any)?.bannerURL && (
          <img src={(userProfile as any).bannerURL} alt="Banner" className="w-full h-full object-cover" />
        )}
        {/* Profile Photo */}
        <div className="absolute -bottom-16 left-4 w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
          {userProfile.photoURL ? (
            <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-full h-full p-4 text-gray-400 bg-gray-100" />
          )}
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pt-20 pb-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">{userProfile.displayName}</h2>
            <p className="text-gray-500">@{userProfile.username}</p>
          </div>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="px-4 py-1.5 border border-gray-300 rounded-full font-bold hover:bg-gray-50 transition-colors"
          >
            Editar perfil
          </button>
        </div>

        <p className="mt-4 text-gray-900 whitespace-pre-wrap">
          {(userProfile as any)?.bio || 'Bem-vindo ao meu perfil no OffMe! 🚀'}
        </p>

        <div className="flex flex-wrap gap-y-2 gap-x-4 mt-4 text-gray-500 text-sm">
          {(userProfile as any)?.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{(userProfile as any).location}</span>
            </div>
          )}
          {(userProfile as any)?.website && (
            <div className="flex items-center space-x-1">
              <LinkIcon className="w-4 h-4" />
              <a href={(userProfile as any).website.startsWith('http') ? (userProfile as any).website : `https://${(userProfile as any).website}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                {(userProfile as any).website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="w-4 h-4" />
            <span>Entrou em Março de 2026</span>
          </div>
        </div>

        <div className="flex space-x-4 mt-4 text-sm">
          <button className="hover:underline">
            <span className="font-bold text-black">{userProfile.following?.length || 0}</span> <span className="text-gray-500">Seguindo</span>
          </button>
          <button className="hover:underline">
            <span className="font-bold text-black">{userProfile.followers?.length || 0}</span> <span className="text-gray-500">Seguidores</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button className="flex-1 py-4 font-bold text-black relative hover:bg-black/5 transition-colors">
          Posts
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full" />
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-black/5 transition-colors">
          Respostas
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-black/5 transition-colors">
          Mídia
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-black/5 transition-colors">
          Curtidas
        </button>
      </div>

      <div className="p-8 text-center text-gray-500">
        Ainda não há posts.
      </div>

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
      />
    </div>
  );
}
