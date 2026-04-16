import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon, Plus } from 'lucide-react';
import VerifiedBadge from '../VerifiedBadge';

interface IOSLayoutProps {
  userProfile: any;
  navItems: any[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  openCreateModal: (replyTo?: any, quotePost?: any) => void;
  setIsLogoutModalOpen: (open: boolean) => void;
  isDrawerOpen: boolean;
  closeDrawer: () => void;
  openDrawer: () => void;
  openImageViewer: (src: string, alt: string) => void;
  Outlet: any;
  location: any;
}

export default function IOSLayout({
  userProfile,
  navItems,
  unreadNotificationsCount,
  unreadMessagesCount,
  openCreateModal,
  setIsLogoutModalOpen,
  isDrawerOpen,
  closeDrawer,
  openDrawer,
  openImageViewer,
  Outlet,
  location
}: IOSLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-white overflow-x-clip">
      {/* Main Content Area */}
      <main className="flex-1 w-full relative pb-[calc(85px+env(safe-area-inset-bottom))]">
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

      {/* iOS Bottom Navigation - Ultra Glassmorphism */}
      {location.pathname !== '/premium' && !location.pathname.startsWith('/chat/') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-2xl border-t border-black/5 pb-[env(safe-area-inset-bottom)]">
          <nav className="flex justify-around items-center h-[65px] relative px-4">
            {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[5]].map((item) => {
              const isActive = location.pathname === item.path;
              
              if (item.isAction) {
                return (
                  <button
                    key={item.path}
                    onClick={() => openCreateModal()}
                    className="relative p-2 rounded-2xl transition-all duration-300 z-10 flex flex-col items-center justify-center active:scale-90"
                  >
                    <div className="bg-black text-white p-2.5 rounded-2xl shadow-xl shadow-black/20 ring-4 ring-white/50">
                      <Plus className="w-6 h-6 stroke-[3px]" />
                    </div>
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative p-3 rounded-full transition-all duration-300 z-10 flex flex-col items-center justify-center ${
                    isActive ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  <motion.div 
                    className="relative flex flex-col items-center"
                    whileTap={{ scale: 0.85 }}
                  >
                    <item.icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                    
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

      {/* iOS Side Drawer - Sliding Panel */}
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
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-white/95 backdrop-blur-3xl z-50 sm:hidden shadow-[20px_0_50px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden"
            >
              {/* Header with Profile Info */}
              <div className="relative pt-[max(env(safe-area-inset-top),20px)] border-b border-gray-50">
                {/* Beta Badge */}
                <div className="absolute top-[max(env(safe-area-inset-top),20px)] right-6 z-20">
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-100/80 px-2 py-1 rounded-lg border border-amber-200 shadow-sm">Beta</span>
                </div>
                
                <div className="p-6">
                  <div 
                    className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden mb-4 shadow-xl cursor-zoom-in transform transition-transform active:scale-95 border-2 border-white"
                    onClick={() => userProfile?.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
                  >
                    <img src={userProfile?.photoURL || '/ghost.svg'} alt={userProfile?.displayName} className="w-full h-full object-cover" />
                  </div>
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
              
              {/* Scrollable Navigation */}
              <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
                {navItems.filter(item => !item.isAction).map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={closeDrawer} 
                      className={`flex items-center px-4 py-3.5 text-base font-bold rounded-xl transition-all active:scale-[0.98] ${
                        isActive ? 'bg-black text-white shadow-lg' : 'text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className={`mr-4 w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} /> 
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              
              {/* Footer with Logout */}
              <div className="p-4 border-t border-gray-100 pb-[max(env(safe-area-inset-bottom),20px)]">
                <button 
                  onClick={() => { closeDrawer(); setIsLogoutModalOpen(true); }} 
                  className="flex items-center font-black text-[#FF3B30] hover:bg-red-50 w-full p-3.5 rounded-xl transition-all active:scale-95"
                >
                  <LogOut className="mr-4 w-5 h-5" /> Sair da conta
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
