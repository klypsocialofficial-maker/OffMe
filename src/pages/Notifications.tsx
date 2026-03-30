import React from 'react';
import { Bell } from 'lucide-react';

export default function Notifications() {
  return (
    <div className="w-full h-full bg-white/50">
      <div className="sticky top-0 bg-white/40 backdrop-blur-3xl backdrop-saturate-200 z-30 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-gray-100/50">
        <h1 className="text-xl font-bold">Notificações</h1>
      </div>
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 mt-10">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Bell className="w-10 h-10 text-blue-500" />
        </div>
        <p className="text-2xl font-bold text-black mb-2">Tudo limpo por aqui</p>
        <p>Quando alguém interagir com você ou com suas postagens, você verá aqui.</p>
      </div>
    </div>
  );
}
