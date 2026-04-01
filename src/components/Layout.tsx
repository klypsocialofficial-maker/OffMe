import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Bookmark, List, Zap, Settings, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import VerifiedBadge from './VerifiedBadge';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const navItems = [
  { path: '/', icon: HomeIcon, label: 'Início' },
  { path: '/explore', icon: Search, label: 'Explorar' },
  { path: '/notifications', icon: Bell, label: 'Notificações' },
  { path: '/messages', icon: Mail, label: 'Mensagens' },
  { path: '/profile', icon: UserIcon, label: 'Perfil' },
  { path: '/premium', icon: Zap, label: 'Premium' },
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

  return (
    <div className="min-h-screen text-gray-900 flex justify-center relative bg-white">
      {/* Decorative background blobs to make the glass effect visible */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 blur-[120px] pointer-events-none" />
      
      {/* Sidebar Navigation (Desktop) */}
      <header className="hidden sm:flex flex-col w-64 border-r border-gray-100 px-4 py-6 sticky top-0 h-screen z-20">
        <div className="flex items-center mb-8 px-4">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-xl">
            O
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
                  isActive ? 'font-bold text-black' : 'text-gray-600 hover:bg-black/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktop-active-tab"
                    className="absolute inset-0 bg-black/5 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                  {item.path === '/messages' && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button 
            onClick={logout}
            className="flex items-center space-x-4 px-4 py-3 w-full hover:bg-red-500/10 rounded-2xl transition-all text-red-500"
          >
            <LogOut className="w-6 h-6" />
            <span className="text-lg font-medium">Sair</span>
          </button>
          
          {userProfile && (
            <div className="mt-4 flex items-center px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {userProfile.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-full h-full p-2 text-gray-400" />
                )}
              </div>
              <div className="ml-3 overflow-hidden">
                <div className="flex items-center space-x-1">
                  <p className="font-bold text-sm truncate">{userProfile.displayName}</p>
                  {(userProfile.isVerified || userProfile.username === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
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
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            <Outlet context={{ openDrawer }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation with Liquid Glass */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 flex justify-around p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 shadow-[0_-8px_32px_0_rgba(0,0,0,0.04)] border-t border-white/50">
        {navItems.slice(0, 4).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative p-3 rounded-full transition-colors z-10 ${
                isActive ? 'text-black' : 'text-gray-500'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-active-tab"
                  className="absolute inset-0 bg-black/10 rounded-full -z-10 backdrop-blur-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
                {item.path === '/messages' && unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        <button onClick={openDrawer} className="p-3 text-gray-500">
          <Menu className="w-6 h-6" />
        </button>
      </nav>

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
              <div className="p-4 border-b border-gray-100 pt-[calc(1rem+env(safe-area-inset-top))]">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mb-3">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-full h-full p-2 text-gray-400" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <h2 className="font-bold text-lg leading-tight">{userProfile?.displayName}</h2>
                  {(userProfile?.isVerified || userProfile?.username === 'Rulio') && <VerifiedBadge className="w-4 h-4 text-blue-500 flex-shrink-0" />}
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
              
              <nav className="flex-1 overflow-y-auto py-2">
                <Link to="/profile" onClick={closeDrawer} className="flex items-center px-4 py-4 text-xl font-bold hover:bg-gray-100 transition-colors">
                  <UserIcon className="mr-4 w-6 h-6" /> Perfil
                </Link>
                <Link to="/premium" onClick={closeDrawer} className="flex items-center px-4 py-4 text-xl font-bold hover:bg-gray-100 transition-colors">
                  <Zap className="mr-4 w-6 h-6" /> Premium
                </Link>
                <Link to="/bookmarks" onClick={closeDrawer} className="flex items-center px-4 py-4 text-xl font-bold hover:bg-gray-100 transition-colors">
                  <Bookmark className="mr-4 w-6 h-6" /> Itens salvos
                </Link>
                <Link to="/lists" onClick={closeDrawer} className="flex items-center px-4 py-4 text-xl font-bold hover:bg-gray-100 transition-colors">
                  <List className="mr-4 w-6 h-6" /> Listas
                </Link>
                <Link to="/settings" onClick={closeDrawer} className="flex items-center px-4 py-4 text-xl font-bold hover:bg-gray-100 transition-colors">
                  <Settings className="mr-4 w-6 h-6" /> Configurações
                </Link>
              </nav>
              
              <div className="p-4 border-t border-gray-100 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <button 
                  onClick={() => { closeDrawer(); logout(); }} 
                  className="flex items-center font-bold text-red-500 hover:bg-red-50 w-full p-3 rounded-xl transition-colors"
                >
                  <LogOut className="mr-4 w-6 h-6" /> Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
