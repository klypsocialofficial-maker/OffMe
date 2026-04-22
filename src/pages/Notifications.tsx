import React, { useState, useEffect } from 'react';
import { Bell, User as UserIcon, Heart, UserPlus, MessageCircle, Repeat, AtSign } from 'lucide-react';
import LazyImage from '../components/LazyImage';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getDefaultAvatar } from '../lib/avatar';
import { motion, AnimatePresence } from 'motion/react';

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

export default function Notifications() {
  const { userProfile, acceptFollowRequest, declineFollowRequest } = useAuth();
  const navigate = useNavigate();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'verified'>('all');
  const [activeType, setActiveType] = useState<'all' | 'like' | 'reply' | 'mention' | 'follow'>('all');

  const handleAcceptRequest = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    if (!notification.followRequestId || processingId) return;
    setProcessingId(notification.id);
    try {
      await acceptFollowRequest(notification.followRequestId);
    } catch (error) {
      console.error("Error accepting request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation();
    if (!notification.followRequestId || processingId) return;
    setProcessingId(notification.id);
    try {
      await declineFollowRequest(notification.followRequestId);
    } catch (error) {
      console.error("Error declining request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const typeFilters = [
    { id: 'all', label: 'Tudo' },
    { id: 'like', label: 'Curtidas' },
    { id: 'reply', label: 'Respostas' },
    { id: 'mention', label: 'Menções' },
    { id: 'follow', label: 'Seguidores' },
  ];

  useEffect(() => {
    if (!userProfile?.uid || !db) return;

    let q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(results);
      setLoading(false);

      // Mark unread notifications as read
      const unreadDocs = snapshot.docs.filter(doc => !doc.data().read);
      if (unreadDocs.length > 0) {
        const batch = writeBatch(db);
        unreadDocs.forEach(d => {
          batch.update(doc(db, 'notifications', d.id), { read: true });
        });
        batch.commit().catch(err => console.error("Error marking as read:", err));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  return (
    <div className="w-full min-h-full bg-transparent relative">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[max(env(safe-area-inset-top),44px)]">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between relative mb-4 h-10">
            <button onClick={openDrawer} className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden border border-white/40 shadow-sm z-10">
              {userProfile?.photoURL ? (
                <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
              ) : (
                <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
              )}
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
              <h1 className="text-lg font-black italic tracking-tighter">Notificações</h1>
            </div>
            <div className="w-10 h-10 sm:hidden z-10" /> {/* Spacer */}
          </div>

          <div className="flex justify-center">
            <nav className="liquid-glass-pill p-1 rounded-full flex items-center relative overflow-hidden border border-white/40 shadow-lg whitespace-nowrap">
              <button 
                onClick={() => setActiveTab('all')}
                className={`relative px-6 py-2 text-sm font-bold transition-all duration-300 z-10 ${
                  activeTab === 'all' ? 'text-black' : 'text-gray-500 hover:text-black'
                }`}
              >
                {activeTab === 'all' && (
                  <motion.div
                    layoutId="notif-tab-blob"
                    className="absolute inset-0 bg-white/80 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                All
              </button>
              <button 
                onClick={() => setActiveTab('verified')}
                className={`relative px-6 py-2 text-sm font-bold transition-all duration-300 z-10 ${
                  activeTab === 'verified' ? 'text-black' : 'text-gray-500 hover:text-black'
                }`}
              >
                {activeTab === 'verified' && (
                  <motion.div
                    layoutId="notif-tab-blob"
                    className="absolute inset-0 bg-white/80 rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                Verified
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-2 px-1 mt-4 no-scrollbar">
            {typeFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveType(filter.id as any)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  activeType === filter.id 
                    ? 'bg-black text-white shadow-md active:scale-95' 
                    : 'bg-white/50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-20 mt-4">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          (() => {
            let filtered = activeTab === 'verified' 
              ? notifications.filter(n => n.senderVerified || n.senderUsername === 'Rulio') 
              : notifications;
            
            // Filter out notifications from muted users
            filtered = filtered.filter(n => !userProfile?.mutedUsers?.includes(n.senderId));
            
            if (activeType !== 'all') {
              filtered = filtered.filter(n => n.type === activeType);
            }
            
            if (filtered.length > 0) {
              return (
                <div className="space-y-3">
                  {filtered.map(notification => (
                    <motion.div 
                      key={notification.id} 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      layout
                      onClick={() => {
                        if (notification.postId) {
                          navigate(`/post/${notification.postId}`);
                        } else if (notification.type === 'follow' && notification.senderUsername) {
                          navigate(`/${notification.senderUsername}`); 
                        }
                      }}
                      className={`p-4 rounded-2xl transition-all flex space-x-4 cursor-pointer liquid-glass-card ${
                        notification.read ? 'opacity-80 hover:opacity-100' : 'border-l-4 border-l-blue-500'
                      }`}
                    >
                      <div className="flex-shrink-0 pt-1">
                        {notification.type === 'like' && <Heart className="w-6 h-6 text-red-500 fill-current" />}
                        {notification.type === 'follow' && <UserPlus className="w-6 h-6 text-blue-500" />}
                        {notification.type === 'follow_request' && <UserPlus className="w-6 h-6 text-amber-500" />}
                        {notification.type === 'reply' && <MessageCircle className="w-6 h-6 text-green-500" />}
                        {notification.type === 'repost' && <Repeat className="w-6 h-6 text-green-600" />}
                        {notification.type === 'mention' && <AtSign className="w-6 h-6 text-purple-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (notification.senderUsername) {
                                navigate(`/${notification.senderUsername}`);
                              }
                            }}
                            className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 active:scale-95 transition-transform border border-white/40 shadow-sm"
                          >
                            {notification.senderPhoto ? (
                              <LazyImage src={notification.senderPhoto} alt={notification.senderName} className="w-full h-full" />
                            ) : (
                              <LazyImage src={getDefaultAvatar(notification.senderName, notification.senderUsername)} alt={notification.senderName} className="w-full h-full" />
                            )}
                          </button>
                          {!notification.read && (
                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                          )}
                        </div>
                        <p className="text-gray-900 leading-tight">
                          <span className="flex items-baseline space-x-1 flex-wrap">
                            <span 
                              className="font-bold hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notification.senderUsername) {
                                  navigate(`/${notification.senderUsername}`);
                                }
                              }}
                            >
                              {notification.senderName}
                            </span>
                            {(notification.senderVerified || notification.senderUsername === 'Rulio') && <VerifiedBadge tier={notification.senderPremiumTier} className="w-3.5 h-3.5" />}
                            <span className="text-gray-600 font-medium">
                              {notification.type === 'like' && 'curtiu seu post'}
                              {notification.type === 'follow' && 'começou a seguir você'}
                              {notification.type === 'follow_request' && 'quer seguir você'}
                              {notification.type === 'reply' && 'respondeu ao seu post'}
                              {notification.type === 'repost' && 'repostou seu post'}
                              {notification.type === 'mention' && 'mencionou você'}
                            </span>
                          </span>
                        </p>
                        {notification.type === 'follow_request' && (
                          <div className="flex items-center space-x-2 mt-3">
                            <button
                              onClick={(e) => handleAcceptRequest(e, notification)}
                              disabled={!!processingId}
                              className="px-4 py-1.5 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
                            >
                              Aceitar
                            </button>
                            <button
                              onClick={(e) => handleDeclineRequest(e, notification)}
                              disabled={!!processingId}
                              className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-full text-xs font-bold hover:bg-gray-300 transition-colors disabled:opacity-50"
                            >
                              Recusar
                            </button>
                          </div>
                        )}
                        {notification.content && (
                          <div className="mt-2 p-3 bg-black/5 rounded-xl border border-black/5 italic text-gray-600 text-[14px] line-clamp-2">
                            {notification.content}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            }
            
            return (
              <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 mt-10">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Bell className="w-10 h-10 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-black mb-2">Tudo limpo por aqui</p>
                <p>Nenhuma notificação encontrada com esse filtro.</p>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
