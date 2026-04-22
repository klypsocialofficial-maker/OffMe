import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon, Plus } from 'lucide-react';
import VerifiedBadge from '../VerifiedBadge';
import LazyImage from '../LazyImage';
import { getDefaultAvatar } from '../../lib/avatar';

interface BetaLayoutProps {
  userProfile: any;
  navItems: any[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  openCreateModal: (replyTo?: any, quotePost?: any) => void;
  openEditProfileModal: () => void;
  setIsLogoutModalOpen: (open: boolean) => void;
  isProfileQuickModalOpen: boolean;
  setIsProfileQuickModalOpen: (open: boolean) => void;
  isDrawerOpen: boolean;
  closeDrawer: () => void;
  openDrawer: () => void;
  openImageViewer: (src: string, alt: string) => void;
  Outlet: any;
  location: any;
}

export default function BetaLayout({
  userProfile,
  navItems,
  unreadNotificationsCount,
  unreadMessagesCount,
  openCreateModal,
  openEditProfileModal,
  setIsLogoutModalOpen,
  isProfileQuickModalOpen,
  setIsProfileQuickModalOpen,
  isDrawerOpen,
  closeDrawer,
  openDrawer,
  openImageViewer,
  Outlet,
  location
}: BetaLayoutProps) {
  const navigate = useNavigate();

  const handleProfileClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setIsProfileQuickModalOpen(true);
  };
  const homeClickTimerRef = useRef<any>(null);

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-white overflow-x-clip font-sans">
      {/* Main Content Area */}
      <main className={`flex-1 w-full relative ${location.pathname.startsWith('/messages/') && location.pathname !== '/messages' ? '' : 'pb-[calc(85px+env(safe-area-inset-bottom))]'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full"
          >
            <Outlet context={{ openDrawer, openCreateModal }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Beta Bottom Navigation - Ultra Glassmorphism */}
      {location.pathname !== '/premium' && !(location.pathname.startsWith('/messages/') && location.pathname !== '/messages') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(10px+env(safe-area-inset-bottom))]">
          <nav className="mx-auto max-w-lg bg-white/60 backdrop-blur-[40px] border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] flex justify-around items-center h-[65px] rounded-[32px] px-2 relative">
            {/* Inner background highlight */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            
            {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[5]].map((item) => {
              const isActive = location.pathname === item.path;
              
              if (item.isAction) {
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(20);
                      openCreateModal();
                    }}
                    className="relative flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <div className="bg-black text-white p-3 rounded-2xl shadow-xl shadow-black/20 ring-4 ring-white/30">
                      <Plus className="w-6 h-6 stroke-[3px]" />
                    </div>
                  </button>
                );
              }

              // Double click handling for Home
              const handleHomeClick = (e: React.MouseEvent) => {
                if (navigator.vibrate) navigator.vibrate(10);
                if (item.path === '/') {
                  if (homeClickTimerRef.current) {
                    // Double click
                    clearTimeout(homeClickTimerRef.current);
                    homeClickTimerRef.current = null;
                    window.dispatchEvent(new CustomEvent('applet:refresh-feed'));
                  } else {
                    // Single click
                    if (isActive) {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('applet:scroll-to-top'));
                    }
                    homeClickTimerRef.current = setTimeout(() => {
                      homeClickTimerRef.current = null;
                    }, 300);
                  }
                } else if (isActive) {
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              };

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={item.isProfile ? (e) => handleProfileClick(e, item.path) : handleHomeClick}
                  className={`relative p-3 rounded-full transition-all duration-300 z-10 flex flex-col items-center justify-center active:bg-black/5 ${
                    isActive ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  <motion.div 
                    className="relative flex flex-col items-center"
                    whileTap={{ scale: 0.9 }}
                  >
                    {item.isProfile ? (
                      <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all duration-300 ${isActive ? 'border-black' : 'border-transparent'}`}>
                        {userProfile?.photoURL ? (
                          <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                        ) : (
                          <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                        )}
                      </div>
                    ) : (
                      <item.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                    )}
                    
                    {isActive && (
                      <motion.div 
                        layoutId="active-dot"
                        className="absolute -bottom-1 w-1 h-1 bg-black rounded-full"
                      />
                    )}

                    <AnimatePresence>
                      {((item.path === '/notifications' && unreadNotificationsCount > 0) || 
                        (item.path === '/messages' && unreadMessagesCount > 0)) && (
                        <motion.span 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm"
                        >
                          {item.path === '/notifications' ? unreadNotificationsCount : unreadMessagesCount}
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

      {/* Beta Side Drawer - Sliding Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-50 sm:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-2 left-2 bottom-2 w-[85%] max-w-[320px] bg-white/80 backdrop-blur-[50px] z-50 sm:hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col rounded-[32px] border border-white/40 overflow-hidden"
            >
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/30 to-white/5 pointer-events-none" />
              
              {/* Header with Profile Info */}
              <div className="relative pt-[max(env(safe-area-inset-top),20px)] border-b border-black/5 z-10">
                {/* Beta Badge */}
                <div className="absolute top-[max(env(safe-area-inset-top),20px)] right-6 z-20">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-100/50 px-2 py-1 rounded-lg border border-blue-200/50 shadow-sm backdrop-blur-sm">BETA</span>
                </div>
                
                {/* Full-width Banner area */}
                <div className="relative h-28 w-full bg-gray-200 overflow-hidden">
                    {userProfile?.bannerURL && <LazyImage src={userProfile.bannerURL} alt="Banner" className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />
                </div>

                <div className="px-6 pb-6 -mt-10 relative">
                  {/* Avatar overlaying */}
                  <div 
                    className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shadow-xl cursor-zoom-in transform transition-transform active:scale-95 border-[3px] border-white relative z-20"
                    onClick={() => userProfile?.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
                  >
                    {userProfile?.photoURL ? (
                      <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                    ) : (
                      <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                    )}
                  </div>
                  
                  <div className="mt-3">
                      <div className="flex items-center space-x-1.5">
                        <h2 className="font-black text-xl leading-tight text-gray-900 tracking-tight truncate">{userProfile?.displayName}</h2>
                        {(userProfile?.isVerified || userProfile?.username === 'Rulio') && <VerifiedBadge className="w-4 h-4 flex-shrink-0" tier={userProfile?.premiumTier} />}
                      </div>
                      <p className="text-gray-500 font-semibold text-base truncate">@{userProfile?.username}</p>
                      
                      <div className="flex space-x-4 mt-4">
                        <div className="flex items-baseline space-x-1">
                          <span className="font-black text-black text-base">{userProfile?.following?.length || 0}</span>
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Seguindo</span>
                        </div>
                        <div className="flex items-baseline space-x-1">
                          <span className="font-black text-black text-base">{userProfile?.followers?.length || 0}</span>
                          <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Seguidores</span>
                        </div>
                      </div>
                  </div>
                </div>
              </div>

              
              {/* Scrollable Navigation */}
              <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar z-10">
                {navItems.filter(item => !item.isAction).map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={closeDrawer} 
                      className={`flex items-center px-4 py-4 text-base font-bold rounded-2xl transition-all active:scale-[0.96] ${
                        isActive 
                        ? 'bg-black text-white shadow-lg shadow-black/20' 
                        : 'text-gray-800 hover:bg-black/5'
                      }`}
                    >
                      <item.icon className={`mr-4 w-5.5 h-5.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} /> 
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              
              {/* Footer with Logout */}
              <div className="p-4 border-t border-black/5 pb-[max(env(safe-area-inset-bottom),20px)] z-10">
                <button 
                  onClick={() => { closeDrawer(); setIsLogoutModalOpen(true); }} 
                  className="flex items-center font-black text-[#FF3B30] hover:bg-red-50/50 w-full p-4 rounded-2xl transition-all active:scale-[0.96] backdrop-blur-sm"
                >
                  <LogOut className="mr-4 w-5.5 h-5.5" /> Sair da conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
