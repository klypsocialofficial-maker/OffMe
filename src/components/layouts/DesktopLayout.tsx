import React, { useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus } from 'lucide-react';
import VerifiedBadge from '../VerifiedBadge';
import RightSidebar from '../RightSidebar';
import LazyImage from '../LazyImage';
import { getDefaultAvatar } from '../../lib/avatar';

interface DesktopLayoutProps {
  userProfile: any;
  navItems: any[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  openCreateModal: (replyTo?: any, quotePost?: any) => void;
  openEditProfileModal: () => void;
  setIsLogoutModalOpen: (open: boolean) => void;
  isProfileQuickModalOpen: boolean;
  setIsProfileQuickModalOpen: (open: boolean) => void;
  openDrawer?: () => void;
  Outlet: any;
  location: any;
}

export default function DesktopLayout({
  userProfile,
  navItems,
  unreadNotificationsCount,
  unreadMessagesCount,
  openCreateModal,
  openEditProfileModal,
  setIsLogoutModalOpen,
  isProfileQuickModalOpen,
  setIsProfileQuickModalOpen,
  openDrawer,
  Outlet,
  location
}: DesktopLayoutProps) {
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);
  const sidebarProfileRef = useRef<HTMLDivElement>(null);

  const handleProfileClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setIsProfileQuickModalOpen(!isProfileQuickModalOpen);
  };
  const homeClickTimerRef = useRef<any>(null);

  return (
    <div className="flex w-full justify-center lg:justify-start">
      {/* Sidebar Navigation (Desktop) */}
      <header className="hidden sm:flex flex-col w-20 xl:w-64 border-r border-gray-100/50 px-2 xl:px-4 py-6 sticky top-0 h-screen z-20 bg-white/70 backdrop-blur-md">
        <div className="flex items-center mb-8 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rotate-3 cursor-pointer">
              <img src="/logo.svg" alt="OffMe" className="w-full h-full drop-shadow-md" />
            </div>
            <div className="flex flex-col hidden xl:block">
              <span className="text-2xl font-black tracking-tighter">OffMe</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mt-4 relative pb-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isCopa = item.path.includes('Copa2026');
            
            if (item.isAction) {
              return null;
            }

            // Double click handling for Home
            const handleHomeClick = (e: React.MouseEvent) => {
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
                className={`flex items-center justify-center xl:justify-start space-x-3 px-3 py-2.5 rounded-full transition-all relative z-10 group ${
                  isActive ? 'text-black' : isCopa ? 'text-amber-500 hover:bg-amber-50' : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <motion.div 
                  className="relative flex items-center" 
                  ref={item.isProfile ? profileRef : undefined}
                  animate={isCopa ? {
                    scale: [1, 1.05, 1],
                  } : {}}
                  transition={isCopa ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  {item.isProfile ? (
                    <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-all duration-200 ${isActive ? 'border-black' : 'border-transparent'}`}>
                      {userProfile?.photoURL ? (
                        <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                      ) : (
                        <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                      )}
                    </div>
                  ) : (
                    <div className="relative">
                      <item.icon className={`w-6 h-6 ${isActive || isCopa ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                      {isCopa && (
                        <motion.div 
                          animate={{ scale: [1, 1.8, 1], opacity: [0, 0.4, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 bg-amber-400 rounded-full blur-md -z-10"
                        />
                      )}
                    </div>
                  )}
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
                </motion.div>
                <span className={`text-lg hidden xl:block ${isActive || isCopa ? 'font-black' : 'font-medium'}`}>{item.label}</span>
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
              ref={sidebarProfileRef}
              className="mt-4 flex items-center px-4 py-3 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              onClick={(e) => handleProfileClick(e, `/${userProfile.username}`)}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                {userProfile.photoURL ? (
                  <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                ) : (
                  <LazyImage src={getDefaultAvatar(userProfile.displayName, userProfile.username)} alt={userProfile.displayName} className="w-full h-full" />
                )}
              </div>
              <div className="ml-3 overflow-hidden hidden xl:block">
                <div className="flex items-center space-x-1">
                  <p className="font-bold text-sm truncate">{userProfile.displayName}</p>
                  {(userProfile?.isVerified || userProfile?.username === 'Rulio' || ['Fabricio', 'fabricio'].includes(userProfile?.username)) && <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" tier={userProfile?.username === 'Rulio' ? 'black' : ['Fabricio', 'fabricio'].includes(userProfile?.username) ? 'silver' : userProfile?.premiumTier} />}
                </div>
                <p className="text-gray-500 text-sm truncate">@{userProfile.username}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen z-10 relative border-r border-gray-100 bg-white pb-24 sm:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            <Outlet context={{ openDrawer, openCreateModal }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Right Sidebar (Desktop) */}
      <RightSidebar />

      {/* Profile quick modal positioning logic for desktop */}
      <style>{`
        .profile-modal-desktop {
          position: fixed;
          bottom: 80px;
          left: 20px;
        }
        @media (min-width: 1280px) {
          .profile-modal-desktop {
             left: calc(50% - 640px + 20px);
          }
        }
      `}</style>
      <div className="profile-modal-desktop pointer-events-none">
        <div className="pointer-events-auto">
          {/* The Actual Modal is rendered in Layout.tsx but we could move it here or just handle positioning via portal/CSS */}
        </div>
      </div>
    </div>
  );
}
