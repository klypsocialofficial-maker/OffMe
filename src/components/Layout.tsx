import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Bookmark, List, Zap as ZapIcon, Settings, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import CreatePostModal from './CreatePostModal';
import ConfirmModal from './ConfirmModal';
import ImageViewer from './ImageViewer';
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

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Início' },
  { path: '/explore', icon: Search, label: 'Explorar' },
  { path: '/notifications', icon: Bell, label: 'Notificações' },
  { path: '/messages', icon: Mail, label: 'Mensagens' },
  { path: '/profile', icon: UserIcon, label: 'Perfil' },
  { path: '/premium', icon: ZapIcon, label: 'Premium' },
  { path: '/bookmarks', icon: Bookmark, label: 'Itens salvos' },
  { path: '/lists', icon: List, label: 'Listas' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Layout() {
  const { userProfile, logout } = useAuth();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [replyToPost, setReplyToPost] = useState<any | null>(null);
  const [quotePost, setQuotePost] = useState<any | null>(null);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const openCreateModal = (replyTo: any = null, quotePost: any = null) => {
    setReplyToPost(replyTo);
    setQuotePost(quotePost);
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
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeMessages();
    };
  }, [userProfile?.uid]);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const openImageViewer = (src: string, alt: string) => {
    setViewerImage({ src, alt });
    setIsViewerOpen(true);
  };

  return (
    <div className="min-h-screen text-gray-900 dark:text-white flex justify-center relative bg-white dark:bg-gray-950 transition-colors duration-500 overflow-x-hidden">
      {/* Decorative background blobs to make the glass effect visible */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="fixed top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-pink-400/10 dark:bg-pink-600/5 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[20%] left-[-5%] w-[30%] h-[30%] rounded-full bg-amber-400/10 dark:bg-amber-600/5 blur-[100px] pointer-events-none" />
      
      {/* Sidebar Navigation (Desktop) */}
      <header className="hidden sm:flex flex-col w-64 border-r border-white/40 dark:border-white/10 px-4 py-6 sticky top-0 h-screen z-20 liquid-glass">
        <div className="flex items-center mb-8 px-4">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center overflow-hidden">
            <img src="/ghost.svg" alt="OffMe Logo" className="w-6 h-6 object-contain invert" />
          </div>
          <span className="ml-3 font-bold text-xl tracking-tight">OffMe</span>
        </div>
        
        <nav className="flex-1 space-y-2 mt-8 relative">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all relative z-10 ${
                  isActive ? 'font-bold text-black' : 'text-gray-600 hover:bg-white/40 hover:text-black'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-active-tab"
                    className="absolute inset-0 bg-white/80 rounded-2xl -z-10 shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/40"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                  {item.path === '/messages' && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => openCreateModal()}
            className="w-full mt-4 bg-black text-white rounded-full py-4 font-bold text-lg shadow-lg hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <Plus className="w-6 h-6" />
            <span>Postar</span>
          </button>
        </nav>

        <div className="mt-auto">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center space-x-4 px-4 py-3 w-full hover:bg-red-500/10 rounded-2xl transition-all text-red-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-lg font-medium">Sair</span>
          </button>
          
          {userProfile && (
            <div className="mt-4 flex items-center px-4 py-3">
              <div 
                className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200 cursor-zoom-in"
                onClick={() => userProfile.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
              >
                <img src={userProfile.photoURL || '/ghost.svg'} alt={userProfile.displayName} className="w-full h-full object-cover" />
              </div>
              <div className="ml-3 overflow-hidden">
                <div className="flex items-center space-x-1">
                  <p className="font-bold text-sm truncate">{userProfile.displayName}</p>
                  {(userProfile.isVerified || userProfile.username === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" tier={userProfile.premiumTier} />}
                </div>
                <p className="text-gray-500 text-sm truncate">@{userProfile.username}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl min-h-[100dvh] pb-24 sm:pb-0 z-10 relative border-r border-gray-100">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            <Outlet context={{ openDrawer, openCreateModal }} />
          </motion.div>
        </AnimatePresence>
      </main>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setReplyToPost(null);
          setQuotePost(null);
        }} 
        userProfile={userProfile}
        handleFirestoreError={handleFirestoreError}
        OperationType={OperationType}
        replyTo={replyToPost}
        quotePost={quotePost}
      />

      {/* Mobile Bottom Navigation with Liquid Glass Floating Pill (iOS 26 Style) */}
      {location.pathname !== '/premium' && (
        <div className="sm:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[94%] max-w-md z-40 mobile-navbar-container transition-all duration-300">
          <nav className="liquid-glass-pill rounded-[2.5rem] flex justify-around p-2 relative overflow-hidden group shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
            {/* Iridescent Border Effect */}
            <div className="absolute inset-0 rounded-[2.5rem] border border-white/50 pointer-events-none" />
            
            {/* Liquid highlight effect (Iridescent glow) */}
            <motion.div 
              animate={{ 
                background: [
                  'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.2) 100%)',
                  'linear-gradient(225deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.2) 100%)',
                  'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.2) 100%)'
                ]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 pointer-events-none opacity-40" 
            />
            
            {navItems.slice(0, 4).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative p-3.5 rounded-full transition-all duration-500 z-10 flex flex-col items-center justify-center ${
                    isActive ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active-tab-blob"
                      className="absolute inset-0 bg-white/90 rounded-full -z-10 shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                      transition={{ 
                        type: "spring", 
                        stiffness: 350, 
                        damping: 25,
                        mass: 0.8
                      }}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                    </motion.div>
                  )}
                  
                  <motion.div 
                    className="relative flex flex-col items-center"
                    whileTap={{ scale: 0.85 }}
                    animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                  >
                    <item.icon className={`w-7 h-7 transition-all duration-500 ${isActive ? 'stroke-[2.5px] drop-shadow-sm' : 'stroke-[2px]'}`} />
                    
                    <AnimatePresence>
                      {((item.path === '/notifications' && unreadNotificationsCount > 0) || 
                        (item.path === '/messages' && unreadMessagesCount > 0)) && (
                        <motion.span 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black min-w-[17px] h-[17px] flex items-center justify-center rounded-full border-2 border-white px-0.5 shadow-sm"
                        >
                          {item.path === '/notifications' 
                            ? (unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount)
                            : (unreadMessagesCount > 9 ? '9+' : unreadMessagesCount)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Mobile Drawer Overlay & Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black/40 z-50 sm:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 sm:hidden shadow-2xl flex flex-col"
            >
              <div className="relative border-b border-gray-100 pt-[calc(1rem+env(safe-area-inset-top))]">
                {/* Banner Background */}
                <div 
                  className="absolute top-0 left-0 right-0 h-24 bg-gray-100 -z-10 cursor-zoom-in"
                  onClick={() => userProfile?.bannerURL && openImageViewer(userProfile.bannerURL, `Banner de ${userProfile.displayName}`)}
                >
                  <img src={userProfile?.bannerURL || '/ghost.svg'} alt="Banner" className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90"></div>
                </div>
                
                <div className="p-4 pt-12">
                  <div 
                    className="w-16 h-16 rounded-full bg-white overflow-hidden mb-3 border-4 border-white shadow-sm cursor-zoom-in"
                    onClick={() => userProfile?.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
                  >
                    <img src={userProfile?.photoURL || '/ghost.svg'} alt={userProfile?.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center space-x-1">
                    <h2 className="font-bold text-lg leading-tight">{userProfile?.displayName}</h2>
                    {(userProfile?.isVerified || userProfile?.username === 'Rulio') && <VerifiedBadge className="w-4 h-4 flex-shrink-0" tier={userProfile?.premiumTier} />}
                  </div>
                  <p className="text-gray-500 text-sm">@{userProfile?.username}</p>
                  
                  <div className="flex space-x-4 mt-4 text-sm">
                    <div className="hover:underline cursor-pointer">
                      <span className="font-bold text-black">{userProfile?.following?.length || 0}</span> <span className="text-gray-500">Seguindo</span>
                    </div>
                    <div className="hover:underline cursor-pointer">
                      <span className="font-bold text-black">{userProfile?.followers?.length || 0}</span> <span className="text-gray-500">Seguidores</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-3">
                <Link to="/profile" onClick={closeDrawer} className="liquid-glass-pill flex items-center px-4 py-3.5 text-lg font-bold rounded-2xl transition-all relative overflow-hidden group border border-white/20 dark:border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <UserIcon className="mr-4 w-6 h-6" /> Perfil
                </Link>
                <Link to="/premium" onClick={closeDrawer} className="liquid-glass-pill flex items-center px-4 py-3.5 text-lg font-bold rounded-2xl transition-all relative overflow-hidden group border border-white/20 dark:border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ZapIcon className="mr-4 w-6 h-6" /> Premium
                </Link>
                <Link to="/bookmarks" onClick={closeDrawer} className="liquid-glass-pill flex items-center px-4 py-3.5 text-lg font-bold rounded-2xl transition-all relative overflow-hidden group border border-white/20 dark:border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Bookmark className="mr-4 w-6 h-6" /> Itens salvos
                </Link>
                <Link to="/lists" onClick={closeDrawer} className="liquid-glass-pill flex items-center px-4 py-3.5 text-lg font-bold rounded-2xl transition-all relative overflow-hidden group border border-white/20 dark:border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <List className="mr-4 w-6 h-6" /> Listas
                </Link>
                <Link to="/settings" onClick={closeDrawer} className="liquid-glass-pill flex items-center px-4 py-3.5 text-lg font-bold rounded-2xl transition-all relative overflow-hidden group border border-white/20 dark:border-white/5">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Settings className="mr-4 w-6 h-6" /> Configurações
                </Link>
                
                <button 
                  onClick={() => { closeDrawer(); openCreateModal(); }} 
                  className="w-full bg-black text-white flex items-center justify-center px-4 py-3.5 text-lg font-bold rounded-2xl transition-all shadow-lg hover:bg-gray-900 active:scale-95 mt-4"
                >
                  <Plus className="mr-2 w-6 h-6" /> Postar
                </button>
              </nav>
              
              <div className="p-4 border-t border-gray-100 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button 
                  onClick={() => { closeDrawer(); setIsLogoutModalOpen(true); }} 
                  className="flex items-center font-bold text-red-500 hover:bg-red-50 w-full p-3 rounded-xl transition-colors"
                >
                  <LogOut className="mr-4 w-6 h-6" /> Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </div>
  );
}
