import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Bookmark, List, Zap as ZapIcon, Settings, Plus, Users, Star, ShoppingBag, Trophy, Target, Sparkles, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import CreatePostModal from './CreatePostModal';
import ConfirmModal from './ConfirmModal';
import ImageViewer from './ImageViewer';
import RightSidebar from './RightSidebar';
import PermissionPrompt from './PermissionPrompt';
import Toast from './Toast';
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
import BetaLayout from './layouts/BetaLayout';
import EditProfileModal from './EditProfileModal';
import ProfileQuickModal from './ProfileQuickModal';
import LiquidGlassBackground from './LiquidGlassBackground';

export default function Layout() {
  const { userProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { platform, isIOS, isAndroid, isDesktop } = usePlatform();
  
  useEffect(() => {
    if (isIOS) {
      document.body.classList.add('platform-ios');
    } else {
      document.body.classList.remove('platform-ios');
    }
    return () => {
      document.body.classList.remove('platform-ios');
    };
  }, [isIOS]);
  
  useEffect(() => {
    if (userProfile?.equippedTheme) {
      const themeId = userProfile.equippedTheme.replace('theme_', '') as any;
      if (theme !== themeId) {
        setTheme(themeId);
      }
    }
  }, [userProfile?.equippedTheme, theme, setTheme]);
  
  const navItems = [
    { path: '/', icon: HomeIcon, label: t('nav.home') },
    { path: '/explore', icon: Search, label: t('nav.explore') },
    { path: `/${userProfile?.username || 'profile'}`, icon: UserIcon, label: t('nav.profile'), isProfile: true },
    { path: '#create', icon: Plus, label: t('nav.post'), isAction: true },
    { path: '/notifications', icon: Bell, label: t('nav.notifications') },
    { path: '/messages', icon: Mail, label: t('nav.messages') },
    { path: '/communities', icon: Users, label: t('nav.communities') },
    { path: '/creator-studio', icon: Star, label: t('nav.creation') },
    { path: '/missions', icon: ZapIcon, label: t('nav.missions') },
    { path: '/shop', icon: ShoppingBag, label: t('nav.shop') },
    { path: '/premium', icon: Star, label: t('nav.premium') },
    { path: '/bookmarks', icon: Bookmark, label: t('nav.bookmarks') },
    { path: '/drafts', icon: FileText, label: t('nav.drafts') || 'Rascunhos' },
    { path: '/circle', icon: Users, label: t('nav.circle') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
  ];
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('info');
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isProfileQuickModalOpen, setIsProfileQuickModalOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<any | null>(null);
  const [quotePost, setQuotePost] = useState<any | null>(null);
  const [sharedMusic, setSharedMusic] = useState<any | null>(null);
  const [prefilledContent, setPrefilledContent] = useState<string | null>(null);
  const [isAnonymousDefault, setIsAnonymousDefault] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // --- REAL-TIME MISSION ALERTS STATE ---
  const [missionsList, setMissionsList] = useState<any[]>([]);
  const [missionAlerts, setMissionAlerts] = useState<any[]>([]);
  const prevCompletedIdsRef = React.useRef<string[] | null>(null);

  // 1. Listen for missions changes in database to always have titles and rewards
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'missions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMissionsList(results);
    }, (err) => {
      console.error("Error listening missions in Layout:", err);
    });
    return () => unsubscribe();
  }, []);

  // Helper trigger to append alerts and remove them after 6 seconds
  const triggerMissionAlert = (alert: any) => {
    setMissionAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setMissionAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 6000);
  };

  // 2. Real-time detection of mission completion
  useEffect(() => {
    if (!userProfile?.uid || missionsList.length === 0) {
      prevCompletedIdsRef.current = null;
      return;
    }

    const currentCompletedIds = userProfile.completedMissionIds || [];

    // On initial load, record the current completed set without triggering alerts
    if (prevCompletedIdsRef.current === null) {
      prevCompletedIdsRef.current = currentCompletedIds;
      return;
    }

    // Capture IDs newly present in currentCompletedIds but not in prevCompletedIds
    const newlyCompleted = currentCompletedIds.filter(
      id => !prevCompletedIdsRef.current!.includes(id)
    );

    if (newlyCompleted.length > 0) {
      newlyCompleted.forEach(missionId => {
        const mission = missionsList.find(m => m.id === missionId);
        if (mission) {
          triggerMissionAlert({
            id: 'complete_' + missionId + '_' + Date.now(),
            type: 'completion',
            title: mission.title,
            reward: mission.reward,
            description: `Você concluiu a missão diária "${mission.title}" e faturou +${mission.reward} XP!`
          });
        }
      });
    }

    prevCompletedIdsRef.current = currentCompletedIds;
  }, [userProfile?.completedMissionIds, missionsList]);

  // 3. One-per-day real-time check for daily missions availability
  useEffect(() => {
    if (!userProfile?.uid || missionsList.length === 0) return;

    const todayStr = new Date().toDateString();
    const storedDate = sessionStorage.getItem(`klyp_notified_missions_${userProfile.uid}`);

    if (storedDate !== todayStr) {
      // Show the "New daily missions available" alert once per browser session per day
      // Wait a short delay on mount so it feels integrated
      const timer = setTimeout(() => {
        triggerMissionAlert({
          id: 'available_' + Date.now(),
          type: 'available',
          title: 'Desafios do Dia Disponíveis 🎯',
          description: 'Novas missões diárias estão prontas para você! Complete-as para subir de nível e faturar pontos.'
        });
        sessionStorage.setItem(`klyp_notified_missions_${userProfile.uid}`, todayStr);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userProfile?.uid, missionsList]);

  const openCreateModal = (replyTo: any = null, quotePost: any = null, isAnonymous: boolean = false, sharedMusic: any = null, initialPrefilledContent: string | null = null) => {
    setReplyToPost(replyTo);
    setQuotePost(quotePost);
    setSharedMusic(sharedMusic);
    setPrefilledContent(initialPrefilledContent);
    setIsAnonymousDefault(isAnonymous);
    setIsCreateModalOpen(true);
  };

  const openEditProfileModal = () => {
    setIsEditProfileModalOpen(true);
  };

  useEffect(() => {
    const handleOpenCreateModal = (e: any) => {
      const { replyTo, quotePost, isAnonymous, sharedMusic, prefilledContent } = e.detail || {};
      openCreateModal(replyTo, quotePost, isAnonymous, sharedMusic, prefilledContent);
    };
    window.addEventListener('open-create-modal', handleOpenCreateModal);
    return () => window.removeEventListener('open-create-modal', handleOpenCreateModal);
  }, []);

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

  // Offline status and sync events listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleSynced = (e: any) => {
      const count = e.detail?.count || 1;
      setToastMessage(count === 1 
        ? "Seu rascunho offline foi publicado com sucesso!" 
        : `Seus ${count} rascunhos offline foram publicados com sucesso!`);
      setToastType('success');
      setIsToastOpen(true);
    };

    const handleOfflineSaved = () => {
      setToastMessage('Você está offline. O seu post foi salvo nos rascunhos e será enviado automaticamente assim que a conexão voltar!');
      setToastType('info');
      setIsToastOpen(true);
    };

    const handleDraftSaved = () => {
      setToastMessage('Rascunho salvo com sucesso na aba de rascunhos!');
      setToastType('success');
      setIsToastOpen(true);
    };

    const handleDraftAutoSaved = () => {
      setToastMessage('Rascunho salvo automaticamente na aba de rascunhos!');
      setToastType('success');
      setIsToastOpen(true);
    };

    window.addEventListener('applet:drafts-synced', handleSynced);
    window.addEventListener('applet:offline-post-saved', handleOfflineSaved);
    window.addEventListener('applet:draft-saved-manually', handleDraftSaved);
    window.addEventListener('applet:draft-autosaved', handleDraftAutoSaved);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('applet:drafts-synced', handleSynced);
      window.removeEventListener('applet:offline-post-saved', handleOfflineSaved);
      window.removeEventListener('applet:draft-saved-manually', handleDraftSaved);
      window.removeEventListener('applet:draft-autosaved', handleDraftAutoSaved);
    };
  }, []);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  const renderLayout = () => {
    if (isIOS) {
      return (
        <BetaLayout 
          userProfile={userProfile}
          navItems={navItems}
          unreadNotificationsCount={unreadNotificationsCount}
          unreadMessagesCount={unreadMessagesCount}
          openCreateModal={openCreateModal}
          openEditProfileModal={openEditProfileModal}
          setIsLogoutModalOpen={setIsLogoutModalOpen}
          isProfileQuickModalOpen={isProfileQuickModalOpen}
          setIsProfileQuickModalOpen={setIsProfileQuickModalOpen}
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
          openEditProfileModal={openEditProfileModal}
          setIsLogoutModalOpen={setIsLogoutModalOpen}
          isProfileQuickModalOpen={isProfileQuickModalOpen}
          setIsProfileQuickModalOpen={setIsProfileQuickModalOpen}
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
        openEditProfileModal={openEditProfileModal}
        setIsLogoutModalOpen={setIsLogoutModalOpen}
        isProfileQuickModalOpen={isProfileQuickModalOpen}
        setIsProfileQuickModalOpen={setIsProfileQuickModalOpen}
        openDrawer={openDrawer}
        Outlet={Outlet}
        location={location}
      />
    );
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new-post') {
      openCreateModal();
      // Clean up URL without triggering re-render
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search, location.pathname]);

  return (
    <div className="min-h-screen text-gray-900 flex justify-center relative bg-white transition-colors duration-500 overflow-x-clip">
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-0 left-0 right-0 z-[1000] bg-gradient-to-r from-amber-500 to-orange-600 text-white text-center py-2 px-4 font-bold text-xs tracking-wider shadow-lg flex items-center justify-center space-x-2 border-b border-amber-400"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span>Você está no modo offline. Mostrando conteúdo salvo localmente.</span>
        </motion.div>
      )}
      
      {/* Decorative background blobs - reduced opacity for light mode */}
      {theme === 'liquid_glass' ? (
        <LiquidGlassBackground />
      ) : (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none animate-pulse" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
        </>
      )}
      
      {renderLayout()}

      <Toast 
        message={toastMessage} 
        type={toastType} 
        isOpen={isToastOpen} 
        onClose={() => setIsToastOpen(false)} 
      />

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setReplyToPost(null);
          setQuotePost(null);
          setSharedMusic(null);
          setPrefilledContent(null);
          setIsAnonymousDefault(false);
        }} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
        replyTo={replyToPost}
        quotePost={quotePost}
        isAnonymousDefault={isAnonymousDefault}
        sharedMusic={sharedMusic}
        prefilledContent={prefilledContent}
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

      <EditProfileModal 
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
      />

      <ProfileQuickModal
        isOpen={isProfileQuickModalOpen}
        onClose={() => setIsProfileQuickModalOpen(false)}
        userProfile={userProfile}
        openEditProfileModal={openEditProfileModal}
      />

      {/* Real-time floating mission alerts overlay */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[380px] z-[9999] pointer-events-none space-y-3">
        <AnimatePresence>
          {missionAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -30, scale: 0.9, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.85, x: 50, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-black text-white p-4 rounded-3xl shadow-2xl border border-white/10 flex items-start space-x-3 backdrop-blur-md bg-opacity-95 overflow-hidden relative group"
            >
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shine pointer-events-none" />
              
              <div className="flex-shrink-0 mt-0.5">
                {alert.type === 'completion' ? (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Trophy className="w-5 h-5 fill-current animate-bounce" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Target className="w-5 h-5 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="flex-1 pr-4">
                <h4 className="font-extrabold text-sm tracking-tight flex items-center space-x-1">
                  <span>{alert.title}</span>
                  {alert.type === 'completion' && <Sparkles className="w-4 h-4 text-amber-300 fill-current" />}
                </h4>
                <p className="text-gray-300 text-xs mt-1 leading-normal font-medium">{alert.description}</p>
                <button
                  onClick={() => {
                    navigate('/missions');
                    setMissionAlerts(prev => prev.filter(a => a.id !== alert.id));
                  }}
                  className="mt-2 text-[11px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {alert.type === 'completion' ? 'Ver progresso →' : 'Ver desafios →'}
                </button>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMissionAlerts(prev => prev.filter(a => a.id !== alert.id));
                }}
                className="absolute top-3 right-3 p-1 rounded-full text-gray-400 hover:text-white transition-colors hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
