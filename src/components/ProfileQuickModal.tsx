import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Edit2, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { getDefaultAvatar } from '../lib/avatar';
import VerifiedBadge from './VerifiedBadge';

interface ProfileQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  openEditProfileModal: () => void;
}

export default function ProfileQuickModal({ isOpen, onClose, userProfile, openEditProfileModal }: ProfileQuickModalProps) {
  const navigate = useNavigate();

  if (!userProfile) return null;

  const handleEditProfile = () => {
    onClose();
    openEditProfileModal();
  };

  const handleNewMessage = () => {
    onClose();
    navigate('/messages');
  };

  const handleViewProfile = () => {
    onClose();
    navigate(`/${userProfile.username}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent backdrop that closes the modal when clicked */}
          <div 
            className="fixed inset-0 z-[100] cursor-default" 
            onClick={onClose} 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed z-[101] bottom-20 left-4 right-4 sm:left-auto sm:right-auto sm:bottom-auto sm:top-auto sm:relative bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden w-auto sm:w-72"
            onClick={(e) => e.stopPropagation()}
            style={{
               boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div className="p-4 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
                  {userProfile.photoURL ? (
                    <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                  ) : (
                    <LazyImage src={getDefaultAvatar(userProfile.displayName, userProfile.username)} alt={userProfile.displayName} className="w-full h-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1">
                    <p className="font-black text-sm truncate">{userProfile.displayName}</p>
                    {(userProfile.isVerified || userProfile.username === 'Rulio') && <VerifiedBadge className="w-3 h-3" tier={userProfile.premiumTier} />}
                  </div>
                  <p className="text-gray-500 text-xs truncate">@{userProfile.username}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleViewProfile}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
              >
                <User className="w-5 h-5 text-gray-500" />
                <span className="font-bold text-sm">Ver Perfil</span>
              </button>

              <button
                onClick={handleEditProfile}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
              >
                <Edit2 className="w-5 h-5 text-gray-500" />
                <span className="font-bold text-sm">Editar Perfil</span>
              </button>
              
              <button
                onClick={handleNewMessage}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-2xl transition-colors text-left"
              >
                <Mail className="w-5 h-5 text-gray-500" />
                <span className="font-bold text-sm">Nova Mensagem</span>
              </button>
            </div>
            
            <div className="p-2 border-t border-gray-50 bg-gray-50/30">
               <p className="text-[10px] text-center font-black uppercase tracking-widest text-gray-400 py-1">Ações Rapidas</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
