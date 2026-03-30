import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function PWABadge() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 z-[100] p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 flex flex-col items-center sm:items-start space-y-3 min-w-[300px]">
      <div className="text-sm font-medium text-gray-900">
        {offlineReady
          ? <span>App pronto para uso offline!</span>
          : <span>Nova atualização disponível!</span>}
      </div>
      <div className="flex gap-2 w-full">
        {needRefresh && (
          <button 
            className="flex-1 px-4 py-2 bg-black text-white rounded-full text-sm font-bold hover:bg-gray-800 transition-colors" 
            onClick={() => updateServiceWorker(true)}
          >
            Atualizar
          </button>
        )}
        <button 
          className="flex-1 px-4 py-2 bg-gray-100 text-black rounded-full text-sm font-bold hover:bg-gray-200 transition-colors" 
          onClick={() => close()}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
