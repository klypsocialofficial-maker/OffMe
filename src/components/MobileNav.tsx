import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Bell, Mail, User } from 'lucide-react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { useNotifications } from '../hooks/useNotifications';

export default function MobileNav() {
  const { unreadCount } = useNotifications();
  const user = auth.currentUser;

  const navItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Search, label: 'Explore', to: '/explore' },
    { icon: Bell, label: 'Notifications', to: '/notifications', badge: unreadCount },
    { icon: Mail, label: 'Messages', to: '/messages' },
    { icon: User, label: 'Profile', to: `/profile/${user?.uid}` },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-3 flex items-center justify-between z-50">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "p-2 rounded-full transition-all duration-200 relative",
              isActive ? "text-black scale-110" : "text-gray-400"
            )
          }
        >
          <div className="relative">
            <item.icon className="w-7 h-7" />
            {item.badge !== undefined && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {item.badge}
              </span>
            )}
          </div>
        </NavLink>
      ))}
    </div>
  );
}
