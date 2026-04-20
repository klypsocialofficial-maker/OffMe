import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Bookmark, List, Zap as ZapIcon, Settings, Plus, Users, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import CreatePostModal from './CreatePostModal';
import ConfirmModal from './ConfirmModal';
import ImageViewer from './ImageViewer';
import RightSidebar from './RightSidebar';
import PermissionPrompt from './PermissionPrompt';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { usePlatform } from '../hooks/usePlatform';
import DesktopLayout from './layouts/DesktopLayout';
import AndroidLayout from './layouts/AndroidLayout';
import IOSLayout from './layouts/IOSLayout';

export default function Layout() {
  const { userProfile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { platform, isIOS, isAndroid, isDesktop } = usePlatform();
  
  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Início' },
    { path: '/explore', icon: Search, label: 'Explorar' },
    { path: '/communities', icon: Users, label: 'Comunidades' },
    { path: '#create', icon: Plus, label: 'Postar', isAction: true },
    { path: '/notifications', icon: Bell, label: 'Notificações' },
    { path: '/messages', icon: Mail, label: 'Mensagens' },
    { path: `/${userProfile?.username || 'profile'}`, icon: UserIcon, label: 'Perfil' },
    { path: '/creator-studio', icon: Star, label: 'Criação' },
    { path: '/premium', icon: ZapIcon, label: 'Premium' },
    { path: '/bookmarks', icon: Bookmark, label: 'Itens salvos' },
    { path: '/settings', icon: Settings, label: 'Configurações' },
  ];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<any | null>(null);
  const [quotePost, setQuotePost] = useState<any | null>(null);
  const [isAnonymousDefault, setIsAnonymousDefault] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const openCreateModal = (replyTo: any = null, quotePost: any = null, isAnonymous: boolean = false) => {
    setReplyToPost(replyTo);
    setQuotePost(quotePost);
    setIsAnonymousDefault(isAnonymous);
    setIsCreateModalOpen(true);
  };

  useEffect(() => {
    if (!userProfile?.uid || !db) return;

    // Listen for unread notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userProfile.uid),
      where('read', '==', false)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    });

    // Listen for unread messages in conversations
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userProfile.uid)
    );

    const unsubscribeMessages = onSnapshot(conversationsQuery, (snapshot) => {
      let totalUnread = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.unreadCount && data.unreadCount[userProfile.uid]) {
          totalUnread += data.unreadCount[userProfile.uid];
        }
      });
      setUnreadMessagesCount(totalUnread);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeMessages();
    };
  }, [userProfile?.uid]);

  // Update PWA App Badge
  useEffect(() => {
    const totalUnread = unreadNotificationsCount + unreadMessagesCount;
    if (typeof navigator !== 'undefined' && 'setAppBadge' in navigator) {
      if (totalUnread > 0) {
        (navigator as any).setAppBadge(totalUnread).catch((err: any) => console.error('Error setting app badge:', err));
      } else if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch((err: any) => console.error('Error clearing app badge:', err));
      }
    }
  }, [unreadNotificationsCount, unreadMessagesCount]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  const renderLayout = () => {
    if (isIOS) {
      return (
        <IOSLayout 
          userProfile={userProfile}
          navItems={navItems}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          openCreateModal={openCreateModal}
          setIsLogoutModalOpen={setIsLogoutModalOpen}
          isDrawerOpen={isDrawerOpen}
          closeDrawer={closeDrawer}
          openDrawer={openDrawer}
          openImageViewer={openImageViewer}
          Outlet={Outlet}
          location={location}
        />
      );
    }

    if (isAndroid) {
      return (
        <AndroidLayout 
          userProfile={userProfile}
          navItems={navItems}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          openCreateModal={openCreateModal}
          setIsLogoutModalOpen={setIsLogoutModalOpen}
          isDrawerOpen={isDrawerOpen}
          closeDrawer={closeDrawer}
          openDrawer={openDrawer}
          openImageViewer={openImageViewer}
          Outlet={Outlet}
          location={location}
        />
      );
    }

    return (
      <DesktopLayout 
        userProfile={userProfile}
        navItems={navItems}
        unreadNotificationsCount={unreadNotificationsCount}
        unreadMessagesCount={unreadMessagesCount}
        openCreateModal={openCreateModal}
        setIsLogoutModalOpen={setIsLogoutModalOpen}
        openDrawer={openDrawer}
        Outlet={Outlet}
        location={location}
      />
    );
  };

  return (
    <div className="min-h-screen text-gray-900 flex justify-center relative bg-white transition-colors duration-500 overflow-x-clip">
      {/* Decorative background blobs - reduced opacity for light mode */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      
      {renderLayout()}

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setReplyToPost(null);
          setQuotePost(null);
          setIsAnonymousDefault(false);
        }} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
        replyTo={replyToPost}
        quotePost={quotePost}
        isAnonymousDefault={isAnonymousDefault}
      />

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={logout}
        title="Tem certeza que deseja sair?"
        message="Você precisará fazer login novamente para acessar sua conta."
        confirmText="Sair"
        cancelText="Cancelar"
        type="danger"
      />

      <ImageViewer 
        src={viewerImage?.src || null}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        alt={viewerImage?.alt}
      />

      <PermissionPrompt />
    </div>
  );
}
