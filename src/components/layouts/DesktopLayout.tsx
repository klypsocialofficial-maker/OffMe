import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Plus } from 'lucide-react';
import VerifiedBadge from '../VerifiedBadge';
import RightSidebar from '../RightSidebar';

interface DesktopLayoutProps {
  userProfile: any;
  navItems: any[];
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  openCreateModal: (replyTo?: any, quotePost?: any) => void;
  setIsLogoutModalOpen: (open: boolean) => void;
  Outlet: any;
  location: any;
}

export default function DesktopLayout({
  userProfile,
  navItems,
  unreadNotificationsCount,
  unreadMessagesCount,
  openCreateModal,
  setIsLogoutModalOpen,
  Outlet,
  location
}: DesktopLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex w-full max-w-[1300px] mx-auto justify-center lg:justify-start">
      {/* Sidebar Navigation (Desktop) */}
      <header className="hidden sm:flex flex-col w-20 xl:w-64 border-r border-gray-100 px-2 xl:px-4 py-6 sticky top-0 h-screen z-20 bg-white">
        <div className="flex items-center mb-8 px-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10 rotate-3">
              <img src="/ghost.svg" alt="OffMe" className="w-7 h-7 invert" />
            </div>
            <div className="flex flex-col hidden xl:block">
              <span className="text-2xl font-black tracking-tighter">OffMe</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100 w-fit">Beta</span>
            </div>
          </div>
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
      <main className="flex-1 max-w-[600px] min-h-screen z-10 relative border-r border-gray-100 bg-white pb-24 sm:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <Outlet context={{ openCreateModal }} />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Right Sidebar (Desktop) */}
      <RightSidebar />
    </div>
  );
}
