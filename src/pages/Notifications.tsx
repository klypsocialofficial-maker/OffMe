import React, { useState, useEffect } from 'react';
import { Bell, User as UserIcon, Heart, UserPlus, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
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

export default function Notifications() {
  const { userProfile } = useAuth();
  const { openDrawer } = useOutletContext<{ openDrawer: () => void }>();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid || !db) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(results);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    return unsubscribe;
  }, [userProfile?.uid]);

  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50 flex items-center space-x-4">
        <button onClick={openDrawer} className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 sm:hidden">
          {userProfile?.photoURL ? (
            <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-full h-full p-1.5 text-gray-400" />
          )}
        </button>
        <h1 className="text-xl font-bold">Notificações</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {notifications.map(notification => (
              <div key={notification.id} className="p-4 hover:bg-black/5 transition-colors flex space-x-4 cursor-pointer">
                <div className="flex-shrink-0 pt-1">
                  {notification.type === 'like' && <Heart className="w-6 h-6 text-red-500 fill-current" />}
                  {notification.type === 'follow' && <UserPlus className="w-6 h-6 text-blue-500" />}
                  {notification.type === 'reply' && <MessageCircle className="w-6 h-6 text-green-500" />}
                </div>
                <div className="flex-1">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden mb-2">
                    {notification.senderPhoto ? (
                      <img src={notification.senderPhoto} alt={notification.senderName} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-full h-full p-1.5 text-gray-400" />
                    )}
                  </div>
                  <p className="text-gray-900">
                    <span className="font-bold">{notification.senderName}</span>{' '}
                    {notification.type === 'like' && 'curtiu seu post'}
                    {notification.type === 'follow' && 'começou a seguir você'}
                    {notification.type === 'reply' && 'respondeu ao seu post'}
                  </p>
                  {notification.content && (
                    <p className="text-gray-500 mt-1 line-clamp-2">{notification.content}</p>
                  )}
                </div>
              </div>
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
