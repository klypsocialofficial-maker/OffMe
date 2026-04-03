import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home as HomeIcon, Search, Bell, Mail, User as UserIcon, Bookmark, List, Zap, Settings } from 'lucide-react';
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
                  {(userProfile.isVerified || userProfile.username === 'Rulio') && <VerifiedBadge className="w-3.5 h-3.5 text-black flex-shrink-0" />}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            <Outlet context={{ openDrawer }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation with Liquid Glass Floating Pill (iOS 26 Style) */}
      <div className="sm:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40">
        <nav className="liquid-glass-pill rounded-[2.5rem] flex justify-around p-2.5 relative overflow-hidden group">
          {/* Iridescent Border Effect */}
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/40 pointer-events-none" />
          <div className="absolute inset-[-1px] rounded-[2.5rem] border border-white/20 blur-[1px] pointer-events-none" />
          
          {/* Liquid highlight effect (Iridescent glow) */}
          <motion.div 
            animate={{ 
              background: [
                'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)',
                'linear-gradient(225deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)',
                'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%)'
              ]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 pointer-events-none opacity-50" 
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
                    className="absolute inset-0 bg-white/40 rounded-full -z-10 shadow-[0_4px_12px_rgba(0,0,0,0.05)]"
                    transition={{ 
                      type: "spring", 
                      stiffness: 350, 
                      damping: 25,
                      mass: 0.8
                    }}
                  >
                    {/* Inner glow for the blob */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                  </motion.div>
                )}
                
                <motion.div 
                  className="relative"
                  whileTap={{ scale: 0.85 }}
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                >
                  <item.icon className={`w-6 h-6 transition-all duration-500 ${isActive ? 'stroke-[2.5px] drop-shadow-sm' : 'stroke-[2px]'}`} />
                  
                  {/* Notification/Message Badges */}
                  <AnimatePresence>
                    {((item.path === '/notifications' && unreadNotificationsCount > 0) || 
                      (item.path === '/messages' && unreadMessagesCount > 0)) && (
                      <motion.span 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-1.5 -right-1.5 bg-black text-white text-[9px] font-black min-w-[17px] h-[17px] flex items-center justify-center rounded-full border-2 border-white/80 px-0.5 shadow-sm"
                      >
                        {item.path === '/notifications' 
                          ? (unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount)
                          : (unreadMessagesCount > 9 ? '9+' : unreadMessagesCount)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {isActive && (
                  <motion.span 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4 }}
                    className="text-[9px] font-black mt-1 uppercase tracking-widest"
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

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
                  {(userProfile?.isVerified || userProfile?.username === 'Rulio') && <VerifiedBadge className="w-4 h-4 text-black flex-shrink-0" />}
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
