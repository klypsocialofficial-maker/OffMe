import React, { useState, useEffect } from 'react';
import { Bell, User as UserIcon, Heart, UserPlus, MessageCircle, Repeat, AtSign } from 'lucide-react';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
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
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'verified'>('all');

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
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 py-2">
          <div className="flex items-center justify-between relative mb-4 h-10">
            <button onClick={openDrawer} className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden border border-white/40 shadow-sm z-10">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-full h-full p-2 text-gray-400" />
              )}
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
              <h1 className="text-lg font-black tracking-tight">Notificações</h1>
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
        </div>
      </div>

      <div className="px-4 pb-20">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (activeTab === 'verified' ? notifications.filter(n => n.senderVerified || n.senderUsername === 'Rulio') : notifications).length > 0 ? (
          <div className="space-y-3">
            {(activeTab === 'verified' ? notifications.filter(n => n.senderVerified || n.senderUsername === 'Rulio') : notifications).map(notification => (
              <motion.div 
                key={notification.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                  {notification.type === 'reply' && <MessageCircle className="w-6 h-6 text-green-500" />}
                  {notification.type === 'repost' && <Repeat className="w-6 h-6 text-green-600" />}
                  {notification.type === 'mention' && <AtSign className="w-6 h-6 text-purple-500" />}
                </div>
                <div className="flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mb-2 flex-shrink-0">
                    {notification.senderPhoto ? (
                      <img src={notification.senderPhoto} alt={notification.senderName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-2 text-gray-400" />
                    )}
                  </div>
                  <p className="text-gray-900">
                    <span className="flex items-center space-x-1">
                      <span className="font-bold">{notification.senderName}</span>
                      {(notification.senderVerified || notification.senderUsername === 'Rulio') && <VerifiedBadge tier={notification.senderPremiumTier} />}
                    </span>{' '}
                    {notification.type === 'like' && 'curtiu seu post'}
                    {notification.type === 'follow' && 'começou a seguir você'}
                    {notification.type === 'reply' && 'respondeu ao seu post'}
                    {notification.type === 'repost' && 'repostou seu post'}
                    {notification.type === 'mention' && 'mencionou você'}
                  </p>
                  {notification.content && (
                    <p className="text-gray-500 mt-1 line-clamp-2">{notification.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 mt-10">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Bell className="w-10 h-10 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-black mb-2">Tudo limpo por aqui</p>
            <p>Quando alguém interagir com você ou com suas postagens, você verá aqui.</p>
          </div>
        )}
      </div>
    </div>
  );
}
