import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Bookmark, List, Zap as ZapIcon, Settings, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import CreatePostModal from './CreatePostModal';
import ConfirmModal from './ConfirmModal';
import ImageViewer from './ImageViewer';
import RightSidebar from './RightSidebar';
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
  { path: '#create', icon: Plus, label: 'Postar', isAction: true },
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
  const navigate = useNavigate();
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
    <div className="min-h-screen text-gray-900 flex justify-center relative bg-white transition-colors duration-500">
      {/* Decorative background blobs - reduced opacity for light mode */}
      <div className="fixed top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      
      <div className="flex w-full max-w-[1300px] mx-auto">
        {/* Sidebar Navigation (Desktop) */}
        <header className="hidden sm:flex flex-col w-20 xl:w-64 border-r border-gray-100 px-2 xl:px-4 py-6 sticky top-0 h-screen z-20 bg-white">
          <div className="flex items-center mb-8 px-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center overflow-hidden">
              <img src="/ghost.svg" alt="OffMe Logo" className="w-6 h-6 object-contain invert" />
            </div>
            <span className="ml-3 font-bold text-xl tracking-tight hidden xl:block">OffMe</span>
          </div>
          
          <nav className="flex-1 space-y-1 mt-4 relative">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              
              if (item.isAction) {
                return (
                  <button
                    key={item.path}
                    onClick={() => openCreateModal()}
                    className="w-full flex items-center justify-center xl:justify-start space-x-4 px-4 py-3 rounded-full transition-all text-gray-900 hover:bg-gray-100 group"
                  >
                    <div className="relative">
                      <item.icon className="w-7 h-7" />
                    </div>
                    <span className={`text-xl hidden xl:block ${isActive ? 'font-black' : 'font-medium'}`}>{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-center xl:justify-start space-x-4 px-4 py-3 rounded-full transition-all relative z-10 group ${
                    isActive ? 'text-black' : 'text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <item.icon className={`w-7 h-7 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
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
                  <span className={`text-xl hidden xl:block ${isActive ? 'font-black' : 'font-medium'}`}>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 px-4 hidden xl:block">
            <button 
              onClick={() => openCreateModal()}
              className="w-full bg-black text-white rounded-full py-4 text-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95"
            >
              Postar
            </button>
          </div>
          
          <div className="mt-4 px-4 xl:hidden">
            <button 
              onClick={() => openCreateModal()}
              className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-lg active:scale-95 mx-auto"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mt-4 px-4 xl:hidden">
            <button 
              onClick={() => openCreateModal()}
              className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800 transition-all shadow-lg active:scale-95 mx-auto"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="mt-auto">
            <button 
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center justify-center xl:justify-start space-x-4 px-4 py-3 w-full hover:bg-red-50 rounded-full transition-all text-red-500"
            >
              <LogOut className="w-7 h-7" />
              <span className="text-xl font-bold hidden xl:block">Sair</span>
            </button>
            
            {userProfile && (
              <div 
                className="mt-4 flex items-center px-4 py-3 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                onClick={() => navigate(`/profile/${userProfile.uid}`)}
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                  <img src={userProfile.photoURL || '/ghost.svg'} alt={userProfile.displayName} className="w-full h-full object-cover" />
                </div>
                <div className="ml-3 overflow-hidden hidden xl:block">
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
        <main className="flex-1 max-w-[600px] h-[100dvh] z-10 relative border-r border-gray-100 bg-white">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto pb-24 sm:pb-0"
            >
              <Outlet context={{ openDrawer, openCreateModal }} />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Sidebar (Desktop) */}
        <RightSidebar />
      </div>

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

      {/* Mobile Bottom Navigation */}
      {location.pathname !== '/premium' && !location.pathname.startsWith('/chat/') && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
          <nav className="flex justify-around p-2 relative">
            {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[5]].map((item) => {
              const isActive = location.pathname === item.path;
              
              if (item.isAction) {
                return (
                  <button
                    key={item.path}
                    onClick={() => openCreateModal()}
                    className="relative p-2 rounded-full transition-all duration-300 z-10 flex flex-col items-center justify-center text-gray-500 hover:text-black"
                  >
                    <item.icon className="w-6 h-6 stroke-[2px]" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative p-2 rounded-full transition-all duration-300 z-10 flex flex-col items-center justify-center ${
                    isActive ? 'text-black' : 'text-gray-500 hover:text-black'
                  }`}
                >
                  <motion.div 
                    className="relative flex flex-col items-center"
                    whileTap={{ scale: 0.9 }}
                    animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  >
                    <item.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                    
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
              className="fixed top-0 left-0 bottom-0 w-[300px] bg-white/90 backdrop-blur-2xl z-50 sm:hidden shadow-2xl flex flex-col border-r border-white/20"
            >
              <div className="relative border-b border-white/20 pt-[calc(1.5rem+env(safe-area-inset-top))]">
                {/* Banner Background with Glass Overlay */}
                <div 
                  className="absolute top-0 left-0 right-0 h-32 bg-gray-100 -z-10 cursor-zoom-in"
                  onClick={() => userProfile?.bannerURL && openImageViewer(userProfile.bannerURL, `Banner de ${userProfile.displayName}`)}
                >
                  <img src={userProfile?.bannerURL || '/ghost.svg'} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/40 backdrop-blur-[2px]"></div>
                </div>
                
                <div className="p-6 pt-16">
                  <div 
                    className="w-20 h-20 rounded-full bg-white overflow-hidden mb-4 border-4 border-white shadow-xl cursor-zoom-in transform transition-transform active:scale-95"
                    onClick={() => userProfile?.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
                  >
                    <img src={userProfile?.photoURL || '/ghost.svg'} alt={userProfile?.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <h2 className="font-black text-xl leading-tight text-gray-900">{userProfile?.displayName}</h2>
                    {(userProfile?.isVerified || userProfile?.username === 'Rulio') && <VerifiedBadge className="w-4.5 h-4.5 flex-shrink-0" tier={userProfile?.premiumTier} />}
                  </div>
                  <p className="text-gray-500 font-medium">@{userProfile?.username}</p>
                  
                  <div className="flex space-x-5 mt-5 text-sm">
                    <div className="hover:underline cursor-pointer group">
                      <span className="font-black text-black">{userProfile?.following?.length || 0}</span> <span className="text-gray-500 group-hover:text-black transition-colors">Seguindo</span>
                    </div>
                    <div className="hover:underline cursor-pointer group">
                      <span className="font-black text-black">{userProfile?.followers?.length || 0}</span> <span className="text-gray-500 group-hover:text-black transition-colors">Seguidores</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {navItems.filter(item => !item.isAction).map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={closeDrawer} 
                      className={`flex items-center px-5 py-4 text-lg font-bold rounded-2xl transition-all relative overflow-hidden group ${
                        isActive ? 'bg-black text-white shadow-lg' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className={`mr-4 w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} /> 
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              
              <div className="p-6 border-t border-gray-100 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <button 
                  onClick={() => { closeDrawer(); setIsLogoutModalOpen(true); }} 
                  className="flex items-center font-black text-red-500 hover:bg-red-50 w-full p-4 rounded-2xl transition-all active:scale-95"
                >
                  <LogOut className="mr-4 w-6 h-6" /> Sair da conta
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
