import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Settings, LogOut, Bookmark, List, MessageSquare, ShieldCheck } from 'lucide-react';
import { useDrawer } from '../contexts/DrawerContext';
import { useProfile } from '../hooks/useProfile';
import { useLanguage } from '../contexts/LanguageContext';
import { auth, logout } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function UserDrawer() {
  const { isOpen, closeDrawer } = useDrawer();
  const { profile } = useProfile();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    await logout();
    closeDrawer();
    navigate('/auth');
  };

  const menuItems = [
    { icon: User, label: t('profile'), to: `/profile/${user?.uid}` },
    { icon: List, label: t('lists'), to: '/lists' },
    { icon: Bookmark, label: t('bookmarks'), to: '/bookmarks' },
    { icon: MessageSquare, label: t('communities'), to: '/communities' },
    { icon: ShieldCheck, label: t('verified'), to: '/verified' },
  ];

  const settingsItems = [
    { icon: Settings, label: t('settings'), to: '/settings' },
    { icon: LogOut, label: t('logout'), onClick: handleLogout, className: 'text-red-500' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] sm:hidden overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col"
          >
            {/* User Info */}
            <div className="relative">
              {/* Close Button Overlay */}
              <button 
                onClick={closeDrawer}
                className="absolute top-4 right-4 z-10 p-2 bg-black/20 backdrop-blur-md text-white rounded-full hover:bg-black/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Banner */}
              <div className="h-24 bg-gray-100 relative overflow-hidden">
                {profile?.bannerURL && (
                  <img 
                    src={profile.bannerURL} 
                    alt="Banner" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              <div className="px-6">
                <div className="relative -mt-8 mb-4">
                  <Link 
                    to={`/profile/${user?.uid}`} 
                    onClick={closeDrawer}
                    className="inline-block p-1 bg-white rounded-full shadow-lg"
                  >
                    <img
                      src={profile?.photoURL || 'https://picsum.photos/seed/user/100/100'}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover border-2 border-white"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                </div>

                <div className="space-y-0.5 pb-4">
                  <Link 
                    to={`/profile/${user?.uid}`} 
                    onClick={closeDrawer}
                    className="block group"
                  >
                    <p className="text-lg font-black text-black tracking-tight group-hover:underline truncate">{profile?.displayName}</p>
                    <p className="text-sm text-gray-400 font-medium truncate">@{profile?.username}</p>
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-2">
              <div className="space-y-1 px-3">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={closeDrawer}
                    className="flex items-center gap-4 p-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-black transition-all font-bold group"
                  >
                    <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-lg tracking-tight">{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="my-4 h-px bg-gray-50 mx-6" />

              <div className="space-y-1 px-3">
                {settingsItems.map((item) => (
                  item.onClick ? (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-2xl transition-all font-bold group w-full text-left",
                        item.className || "text-gray-600 hover:bg-gray-50 hover:text-black"
                      )}
                    >
                      <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-lg tracking-tight">{item.label}</span>
                    </button>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={closeDrawer}
                      className="flex items-center gap-4 p-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-black transition-all font-bold group"
                    >
                      <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      <span className="text-lg tracking-tight">{item.label}</span>
                    </Link>
                  )
                ))}
              </div>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-gray-50">
              <p className="text-xs text-gray-300 font-bold uppercase tracking-widest">&copy; 2026 OffMe.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
