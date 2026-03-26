import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Bell, Mail, User, LogOut, MessageCircle, PlusCircle, List, Bookmark, MessageSquare, ShieldCheck, Settings, CheckCircle2 } from 'lucide-react';
import { logout, auth } from '../firebase';
import { cn } from '../lib/utils';
import { useProfile } from '../hooks/useProfile';
import { useNotifications } from '../hooks/useNotifications';
import { useLanguage } from '../contexts/LanguageContext';

export default function Sidebar() {
  const { profile } = useProfile();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const user = auth.currentUser;

  const navItems = [
    { icon: Home, label: t('home'), to: '/' },
    { icon: Search, label: t('explore'), to: '/explore' },
    { icon: Bell, label: t('notifications'), to: '/notifications', badge: unreadCount },
    { icon: Mail, label: t('messages'), to: '/messages' },
    { icon: List, label: t('lists'), to: '/lists' },
    { icon: Bookmark, label: t('bookmarks'), to: '/bookmarks' },
    { icon: MessageSquare, label: t('communities'), to: '/communities' },
    { icon: ShieldCheck, label: t('verified'), to: '/verified' },
    { icon: User, label: t('profile'), to: `/profile/${user?.uid}` },
    { icon: Settings, label: t('settings'), to: '/settings' },
  ];

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="space-y-6">
        <NavLink to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black text-white mb-4 shadow-xl hover:rotate-6 transition-transform duration-300">
          <MessageCircle className="w-7 h-7" />
        </NavLink>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-4 p-3 rounded-2xl transition-all duration-200 group justify-center xl:justify-start relative",
                  isActive ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50 hover:text-black"
                )
              }
            >
              <div className="relative">
                <item.icon className={cn("w-6 h-6 group-hover:scale-110 transition-transform")} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="hidden xl:block text-lg font-bold tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="w-full mt-8 flex items-center justify-center gap-2 p-3 xl:p-4 bg-black text-white rounded-2xl xl:rounded-3xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl active:scale-95 group">
          <PlusCircle className="w-6 h-6 group-hover:rotate-90 transition-transform" />
          <span className="hidden xl:block">Post</span>
        </button>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => logout()}
          className="flex items-center gap-4 p-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all duration-200 group w-full justify-center xl:justify-start"
        >
          <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <span className="hidden xl:block text-lg font-bold tracking-tight">Logout</span>
        </button>

        <div className="flex items-center gap-3 p-2 xl:p-3 rounded-2xl border border-gray-100 bg-gray-50/50 justify-center xl:justify-start">
          <img
            src={profile?.photoURL || 'https://picsum.photos/seed/user/100/100'}
            alt="Profile"
            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="hidden xl:block overflow-hidden">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold text-black truncate">{profile?.displayName}</p>
              {profile?.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
              )}
            </div>
            <p className="text-xs text-gray-400 font-medium truncate">@{profile?.username}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
