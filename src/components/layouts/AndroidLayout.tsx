import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon, Plus } from 'lucide-react';
import VerifiedBadge from '../VerifiedBadge';
import LazyImage from '../LazyImage';
import { getDefaultAvatar } from '../../lib/avatar';

interface AndroidLayoutProps {
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

export default function AndroidLayout({
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
}: AndroidLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-white overflow-x-clip">
      {/* Main Content Area */}
      <main className={`flex-1 w-full relative ${location.pathname.startsWith('/messages/') && location.pathname !== '/messages' ? '' : 'pb-20'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <Outlet context={{ openDrawer, openCreateModal }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Android Bottom Navigation - Material Design feel */}
      {location.pathname !== '/premium' && !(location.pathname.startsWith('/messages/') && location.pathname !== '/messages') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 backdrop-blur-md border-t border-white/20 shadow-lg">
          <nav className="flex justify-around items-center h-16 relative px-2">
            {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[5]].map((item) => {
              const isActive = location.pathname === item.path;
              
              if (item.isAction) {
                return (
                  <button
                    key={item.path}
                    onClick={() => openCreateModal()}
                    className="relative -top-4 p-4 rounded-2xl bg-black text-white shadow-xl active:scale-90 transition-transform"
                  >
                    <Plus className="w-6 h-6 stroke-[3px]" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative p-3 rounded-xl transition-all duration-200 flex flex-col items-center justify-center active:bg-black/5 ${
                    isActive ? 'text-black' : 'text-gray-400'
                  }`}
                >
                  <motion.div
                    className="flex flex-col items-center justify-center"
                    whileTap={{ scale: 0.9 }}
                  >
                    <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                    <span className={`text-[10px] mt-1 font-bold ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                      {item.label}
                    </span>
                    
                    {((item.path === '/notifications' && unreadNotificationsCount > 0) || 
                      (item.path === '/messages' && unreadMessagesCount > 0)) && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black min-w-[16px] h-[16px] flex items-center justify-center rounded-full border-2 border-white">
                        {item.path === '/notifications' ? unreadNotificationsCount : unreadMessagesCount}
                      </span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Android Side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black/50 z-50 sm:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-white/70 backdrop-blur-lg z-50 sm:hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 bg-gray-50 border-b border-gray-100">
                  <div 
                    className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden mb-4 border-2 border-white shadow-md"
                    onClick={() => userProfile?.photoURL && openImageViewer(userProfile.photoURL, `Avatar de ${userProfile.displayName}`)}
                  >
                    {userProfile?.photoURL ? (
                      <LazyImage src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full" />
                    ) : (
                      <LazyImage src={getDefaultAvatar(userProfile?.displayName || '', userProfile?.username || '')} alt={userProfile?.displayName} className="w-full h-full" />
                    )}
                  </div>
                <div className="flex items-center space-x-1">
                  <h2 className="font-bold text-lg text-gray-900">{userProfile?.displayName}</h2>
                  {(userProfile?.isVerified || userProfile?.username === 'Rulio') && <VerifiedBadge className="w-4 h-4" tier={userProfile?.premiumTier} />}
                </div>
                <p className="text-gray-500 text-sm">@{userProfile?.username}</p>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                {navItems.filter(item => !item.isAction).map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link 
                      key={item.path}
                      to={item.path} 
                      onClick={closeDrawer} 
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="mr-4 w-5 h-5" /> 
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              
              <div className="p-4 border-t border-gray-100">
                <button 
                  onClick={() => { closeDrawer(); setIsLogoutModalOpen(true); }} 
                  className="flex items-center text-red-500 hover:bg-red-50 w-full p-3 rounded-lg transition-colors text-sm font-medium"
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
