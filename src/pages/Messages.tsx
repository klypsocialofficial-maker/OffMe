import React, { useState, useEffect } from 'react';
import { Mail, User as UserIcon, Send, MoreHorizontal, Trash2, Archive } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

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

export default function Messages() {
  const { userProfile } = useAuth();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    if (!userProfile?.uid || !db) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter out archived and sort by updatedAt descending in memory
      results = results
        .filter((conv: any) => conv.archived !== true)
        .sort((a: any, b: any) => {
          const timeA = typeof a.updatedAt?.toMillis === 'function' ? a.updatedAt.toMillis() : 0;
          const timeB = typeof b.updatedAt?.toMillis === 'function' ? b.updatedAt.toMillis() : 0;
          return timeB - timeA;
        });
        
      setConversations(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: 'Apagar conversa',
      message: 'Tem certeza que deseja apagar esta conversa? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'conversations', id));
          showToast('Conversa apagada com sucesso', 'success');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `conversations/${id}`);
        }
      }
    });
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'conversations', id), { archived: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `conversations/${id}`);
    }
  };

  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button onClick={openDrawer} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-1.5 text-gray-400" />
            )}
          </button>
          <h1 className="text-xl font-bold">Mensagens</h1>
        </div>
        <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
          <Mail className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : conversations.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {conversations.map(conversation => {
              // Find the other participant's info (assuming 1-on-1 for now)
              const otherParticipantId = conversation.participants.find((id: string) => id !== userProfile?.uid);
              const otherParticipantInfo = conversation.participantInfo?.[otherParticipantId];

              return (
                <div 
                  key={conversation.id} 
                  onClick={() => navigate(`/messages/${conversation.id}`)}
                  className="p-4 hover:bg-black/5 transition-colors flex items-center space-x-4 cursor-pointer relative"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {otherParticipantInfo?.photoURL ? (
                      <img src={otherParticipantInfo.photoURL} alt={otherParticipantInfo.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <div className="flex items-center space-x-1 truncate">
                            <p className={`font-bold text-black truncate ${conversation.unreadCount?.[userProfile?.uid] ? 'font-black' : ''}`}>
                              {otherParticipantInfo?.displayName || 'Usuário'}
                            </p>
                            {(otherParticipantInfo?.isVerified || otherParticipantInfo?.username === 'Rulio') && <VerifiedBadge tier={otherParticipantInfo?.premiumTier} />}
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {conversation.updatedAt?.toDate ? new Date(conversation.updatedAt.toDate()).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className={`text-sm truncate flex-1 ${conversation.unreadCount?.[userProfile?.uid] ? 'text-black font-bold' : 'text-gray-500'}`}>
                            {conversation.lastMessage || 'Nova conversa'}
                          </p>
                          {conversation.unreadCount?.[userProfile?.uid] > 0 && (
                            <span className="ml-2 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                              {conversation.unreadCount[userProfile.uid]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={(e) => handleDelete(e, conversation.id)} className="p-2 hover:bg-red-100 rounded-full text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleArchive(e, conversation.id)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 mt-10">
            <p className="text-3xl font-bold text-black mb-4">Bem-vindo à sua caixa de entrada!</p>
            <p className="mb-8">Envie uma mensagem, compartilhe posts e converse de forma privada.</p>
            <button 
              onClick={() => navigate('/explore')}
              className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
            >
              Nova mensagem
            </button>
          </div>
        )}
      </div>
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      <Toast 
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
