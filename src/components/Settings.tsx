import React from 'react';
import { Settings as SettingsIcon, Shield, Bell, Lock, Eye, HelpCircle, ChevronRight, LogOut } from 'lucide-react';
import { logout } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: Shield, label: 'Security and account access', desc: 'Manage your password and security.' },
        { icon: Bell, label: 'Notifications', desc: 'Choose what you want to hear about.' },
        { icon: Lock, label: 'Privacy and safety', desc: 'Control your visibility and data.' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { icon: Eye, label: t('accessibility') + ', display, and languages', desc: 'Manage how you see OffMe.', to: '/settings/accessibility' },
        { icon: HelpCircle, label: 'Help Center', desc: 'Get support and learn more.', to: '/settings/help' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4">
        <h2 className="text-2xl font-black tracking-tight">{t('settings')}</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Manage your experience</p>
      </div>

      <div className="p-4">
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs text-gray-300 font-black uppercase tracking-widest mb-4 px-4">{section.title}</h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <button 
                    key={item.label} 
                    onClick={() => item.to && navigate(item.to)}
                    className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors shadow-sm">
                        <item.icon className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                      </div>
                      <div>
                        <p className="font-black text-black tracking-tight">{item.label}</p>
                        <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-6 border-t border-gray-50">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 rounded-3xl text-red-500 hover:bg-red-50 transition-all font-black group"
            >
              <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-white transition-colors shadow-sm">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="tracking-tight">Log out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
