import React, { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Sparkles, CheckCircle2, X } from 'lucide-react';

const APP_VERSION = '0.0.0.06';

export default function PWABadge() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
      if (r) {
        registrationRef.current = r;
        // Check for updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleCheckUpdate = () => {
      console.log('Manually checking for PWA update...');
      registrationRef.current?.update().then(() => {
        // If no update found, maybe show a toast or message
        // But useRegisterSW will handle 'needRefresh' if it is found
      });
    };
    window.addEventListener('check-pwa-update' as any, handleCheckUpdate);
    return () => window.removeEventListener('check-pwa-update' as any, handleCheckUpdate);
  }, []);

  console.log('PWA Status - offlineReady:', offlineReady, 'needRefresh:', needRefresh);

  const [showChangelog, setShowChangelog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateComplete, setUpdateComplete] = useState(false);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUpdateProgress(100);
        setTimeout(() => {
          setUpdateComplete(true);
          setTimeout(() => {
            updateServiceWorker(true);
          }, 3000);
        }, 500);
      } else {
        setUpdateProgress(progress);
      }
    }, 300);
  };

  if (!offlineReady && !needRefresh) return null;

  if (needRefresh) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          {isUpdating ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center text-white w-full max-w-md"
            >
              <AnimatePresence mode="wait">
                {!updateComplete ? (
                  <motion.div 
                    key="progress"
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center"
                  >
                    <div className="relative w-32 h-32 mb-8">
                      {/* Pulsing background */}
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
                      <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" />
                      
                      {/* Logo */}
                      <div className="relative z-10 w-full h-full rotate-3 p-4">
                        <img src="/logo.svg" alt="OffMe" className="w-full h-full drop-shadow-2xl" />
                      </div>
                      
                      {/* Circular Progress */}
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="48"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="48"
                          fill="none"
                          stroke="white"
                          strokeWidth="4"
                          strokeDasharray={`${updateProgress * 3.01} 301`}
                          className="transition-all duration-300 ease-out"
                        />
                      </svg>
                    </div>
                    
                    <h2 className="text-3xl font-black mb-2">{updateProgress}%</h2>
                    <p className="text-white/60 font-medium">Atualizando o OffMe...</p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="complete"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                      <CheckCircle2 className="w-12 h-12 text-black" />
                    </div>
                    <h2 className="text-3xl font-black mb-3">Tudo pronto!</h2>
                    <p className="text-xl text-white/80 font-medium">
                      Bem vindo a versão <span className="text-white font-bold">{APP_VERSION}</span> do OffMe
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              {/* Decorative background */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-60" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-50 rounded-full -ml-20 -mb-20 blur-3xl opacity-60" />
              
              <div className="relative z-10 p-8 flex flex-col items-center text-center">
                <div className="w-20 h-20 rotate-3 p-2">
                  <img src="/logo.svg" alt="OffMe" className="w-full h-full drop-shadow-2xl" />
                </div>
                
                <h3 className="font-black text-2xl text-gray-900 mb-3 leading-tight">
                  Hey, temos uma nova atualização!
                </h3>
                <p className="text-gray-500 mb-6 font-medium">
                  Bora atualizar para ter a melhor experiência?
                </p>
                
                <div className="w-full mb-6">
                  <button 
                    onClick={() => setShowChangelog(!showChangelog)}
                    className="flex items-center justify-center space-x-2 w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-sm font-bold text-gray-700"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>O que há de novo?</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${showChangelog ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showChangelog && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ul className="text-left mt-4 space-y-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <li className="flex items-start">
                            <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 mr-2 flex-shrink-0" />
                            <span className="font-bold">v0.0.0.05:</span>
                          </li>
                          <li className="flex items-start pl-4">
                            <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0" />
                            <span>Separação de layouts para iOS, Android e Desktop.</span>
                          </li>
                          <li className="flex items-start pl-4">
                            <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0" />
                            <span>Otimização impecável para iOS PWA (Safe Areas).</span>
                          </li>
                          <li className="flex items-start pl-4">
                            <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0" />
                            <span>Novo design de navegação inferior e drawer lateral.</span>
                          </li>
                          <li className="flex items-start">
                            <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 mr-2 flex-shrink-0" />
                            <span className="font-bold">v0.0.0.04:</span>
                          </li>
                          <li className="flex items-start pl-4">
                            <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 mr-2 flex-shrink-0" />
                            <span>Correção definitiva dos cabeçalhos fixos.</span>
                          </li>
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg hover:bg-gray-900 transition-all active:scale-95 shadow-lg shadow-black/20" 
                    onClick={handleUpdate}
                  >
                    Atualizar Agora
                  </button>
                  <button 
                    className="w-full py-3 text-gray-500 font-bold hover:text-black transition-colors" 
                    onClick={() => close()}
                  >
                    Talvez depois
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    );
  }

  if (offlineReady) {
    return (
      <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 z-[100] p-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 flex items-center space-x-4">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900">App pronto!</p>
          <p className="text-sm text-gray-500">Disponível para uso offline.</p>
        </div>
        <button 
          className="p-2 text-gray-400 hover:text-black transition-colors" 
          onClick={() => close()}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return null;
}
