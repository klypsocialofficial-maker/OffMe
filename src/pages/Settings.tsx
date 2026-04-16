import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ArrowLeft, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { requestNotificationPermission } from '../hooks/usePushNotifications';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(Notification.permission === 'granted');

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // Cannot programmatically disable notifications, tell user to do it in browser settings
      alert('Para desativar as notificações, altere as permissões nas configurações do seu navegador.');
    } else {
      if (userProfile?.uid) {
        const success = await requestNotificationPermission(userProfile.uid);
        if (success) {
          setNotificationsEnabled(true);
        }
      }
    }
  };

  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <SettingsIcon className="w-6 h-6" />
          <h1 className="text-xl font-black tracking-tight">Configurações</h1>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="font-bold">Notificações Push</h3>
              <p className="text-sm text-gray-500">Receba alertas de novas atividades.</p>
            </div>
          </div>
          <button
            onClick={toggleNotifications}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
              notificationsEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {notificationsEnabled ? 'Ativado' : 'Ativar'}
          </button>
        </div>
        <div 
          onClick={() => navigate('/settings/account')}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-bold">Sua conta</h3>
          <p className="text-sm text-gray-500">Veja informações sobre sua conta, altere seu e-mail, senha ou nome de usuário.</p>
        </div>
        <div 
          onClick={() => navigate('/settings/privacy')}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-bold">Privacidade e segurança</h3>
          <p className="text-sm text-gray-500">Gerencie as informações que você vê e compartilha no OffMe.</p>
        </div>
        <div 
          onClick={() => navigate('/settings/display')}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-bold">Acessibilidade, exibição e idiomas</h3>
          <p className="text-sm text-gray-500">Gerencie como o conteúdo do OffMe é exibido para você.</p>
        </div>
      </div>
    </div>
  );
}
