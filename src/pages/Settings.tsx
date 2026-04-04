import React from 'react';
import { Settings as SettingsIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <SettingsIcon className="w-6 h-6" />
        <h1 className="text-xl font-bold">Configurações</h1>
      </div>
      <div className="space-y-4">
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
