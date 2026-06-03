import React, { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Sparkles, CheckCircle2, X } from 'lucide-react';

const APP_VERSION = '0.0.0.16';

export default function PWABadge() {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
      if (r) {
        registrationRef.current = r;
        // Check for updates every 3 minutes
        setInterval(() => {
          r.update().catch(err => console.log('Periodic auto check failed:', err));
        }, 3 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  useEffect(() => {
    const handleCheckUpdate = () => {
      console.log('Manually checking for PWA update...');
      if (registrationRef.current) {
        setCheckingUpdate(true);
        registrationRef.current.update().then(() => {
          // needRefresh will be updated by useRegisterSW if found
          setTimeout(() => {
            setCheckingUpdate(false);
            const pwaNeedsRefresh = document.querySelector('[data-pwa-needs-refresh="true"]');
            if (!pwaNeedsRefresh && !needRefresh) {
              setShowUpToDate(true);
              setTimeout(() => setShowUpToDate(false), 3000);
            }
          }, 2000);
        }).catch(err => {
          console.error('Update check failed:', err);
          setCheckingUpdate(false);
        });
      } else {
        console.warn('SW not registered, cannot check for updates');
        setShowUpToDate(true);
        setTimeout(() => setShowUpToDate(false), 3000);
      }
    };

    const handleVisibilityAndFocusCheck = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        console.log('App focused or tab became active. Checking for PWA updates...');
        registrationRef.current.update().catch(err => console.log('Focus-triggered update check failed:', err));
      }
    };

    window.addEventListener('check-pwa-update' as any, handleCheckUpdate);
    document.addEventListener('visibilitychange', handleVisibilityAndFocusCheck);
    window.addEventListener('focus', handleVisibilityAndFocusCheck);

    return () => {
      window.removeEventListener('check-pwa-update' as any, handleCheckUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityAndFocusCheck);
      window.removeEventListener('focus', handleVisibilityAndFocusCheck);
    };
  }, [needRefresh]);

  console.log('PWA Status - offlineReady:', offlineReady, 'needRefresh:', needRefresh);

  const [showChangelog, setShowChangelog] = useState(true); // Default true now to show news
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateComplete, setUpdateComplete] = useState(false);
  const [showUpToDate, setShowUpToDate] = useState(false);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowUpToDate(false);
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    setShowUpToDate(false);
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
          }, 2000);
        }, 500);
      } else {
        setUpdateProgress(progress);
      }
    }, 200);
  };

  // Sync / Fire push notification when update is captured outside spotlight
  useEffect(() => {
    if (needRefresh) {
      if (document.visibilityState !== 'visible') {
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            if (registrationRef.current && registrationRef.current.showNotification) {
               registrationRef.current.showNotification("Nova versão no OffMe!", {
                  body: "Melhorias de segurança de dados (LGPD) e performance prontas para rodar! Toque para aplicar.",
                  icon: "/logo.svg",
                  badge: "/logo.svg",
                  tag: "pwa-update",
                  requireInteraction: true
               });
            } else {
               const notif = new Notification("Nova versão no OffMe!", {
                 body: "Melhorias de segurança de dados (LGPD) e performance prontas para rodar! Toque para aplicar.",
                 icon: "/logo.svg",
                 badge: "/logo.svg",
                 tag: "pwa-update",
                 requireInteraction: true
               });
               notif.onclick = () => {
                 window.focus();
                 handleUpdate();
               };
            }
          } catch (e) {
            console.error('Failed to trigger background push notification:', e);
          }
        }
      } else {
        console.log('App is focused. Foreground sliding banner will render on screen.');
      }
    }
  }, [needRefresh]);

  if (!offlineReady && !needRefresh && !showUpToDate && !checkingUpdate) return null;

  if (checkingUpdate) {
    return (
      <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 z-[100] p-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 flex items-center space-x-4">
        <div className="w-8 h-8 border-3 border-gray-100 border-t-black rounded-full animate-spin" />
        <p className="font-bold text-gray-900">Verificando...</p>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <AnimatePresence>
        {isUpdating ? (
          <div data-pwa-needs-refresh="true" className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
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
                        <img src="/logo.svg" alt="OffMe" className="w-full h-full drop-shadow-2xl" referrerPolicy="no-referrer" />
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
                    <p className="text-white/60 font-medium">Instalando melhorias...</p>
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
                    <h2 className="text-3xl font-black mb-3">Versão {APP_VERSION}!</h2>
                    <p className="text-xl text-white/80 font-medium">
                      O OffMe ficou ainda melhor. Aproveite!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          /* Custom in-app floating banner push notification */
          <div data-pwa-needs-refresh="true" className="fixed top-[calc(16px+env(safe-area-inset-top))] left-4 right-4 md:left-auto md:right-4 md:w-96 z-[250]">
            <motion.div
              initial={{ y: -120, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -120, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 18, stiffness: 120 }}
              className="bg-white dark:bg-zinc-950 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border border-gray-100 dark:border-zinc-800 p-5 relative overflow-hidden"
            >
              {/* Decorative top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-550 to-purple-600 animate-pulse" />
              
              <div className="flex items-start space-x-3.5 mb-3">
                <div className="w-12 h-12 bg-gray-50 dark:bg-zinc-900 rounded-xl flex-shrink-0 flex items-center justify-center p-1.5 border border-black/5 dark:border-white/5 shadow-inner">
                  <img src="/logo.svg" alt="OffMe" className="w-full h-full drop-shadow-md animate-bounce" referrerPolicy="no-referrer" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <span className="text-[9px] font-black tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                    NOTIFICAÇÃO • ATUALIZAÇÃO
                  </span>
                  <h3 className="font-extrabold text-gray-950 dark:text-white text-sm mt-1.5 leading-none">
                    OffMe Atualizado!
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                    A versão {APP_VERSION} está pronta.
                  </p>
                </div>
                <button 
                  onClick={() => close()}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full text-gray-400 dark:text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Collapsible Changelog */}
              <div className="w-full mb-4">
                <button 
                  onClick={() => setShowChangelog(!showChangelog)}
                  className="flex items-center justify-between w-full py-2.5 px-3 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 rounded-xl transition-colors text-xs font-bold text-gray-700 dark:text-zinc-300"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ver o que mudou</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showChangelog ? 'rotate-95' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showChangelog && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <ul className="text-left mt-3 space-y-2 text-xs text-gray-600 dark:text-zinc-400 bg-gray-50/50 dark:bg-zinc-900/50 p-3 rounded-xl border border-gray-100/50 dark:border-zinc-800/50 max-h-[140px] overflow-y-auto">
                        <li className="flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span className="font-bold text-gray-900 dark:text-zinc-200">v{APP_VERSION}:</span>
                        </li>
                        <li className="flex items-start pl-4 text-[11px] leading-relaxed">
                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span>Notificações push PWA corrigidas, tanto para mensagens quanto para atualizações.</span>
                        </li>
                        <li className="flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 mr-2 flex-shrink-0" />
                          <span className="font-bold text-gray-900 dark:text-zinc-200">v0.0.0.15:</span>
                        </li>
                        <li className="flex items-start pl-4 text-[11px] leading-relaxed">
                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span>Correção do erro "404 NOT_FOUND" (Vercel) e roteamento de tela branca após atualizações PWA.</span>
                        </li>
                        <li className="flex items-start pl-4 text-[11px] leading-relaxed">
                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span>Adicionado roteamento nativo no aplicativo com compartilhamento via API (Web Share).</span>
                        </li>
                        <li className="flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 mr-2 flex-shrink-0" />
                          <span className="font-bold text-gray-900 dark:text-zinc-200">v0.0.0.14:</span>
                        </li>
                        <li className="flex items-start pl-4 text-[11px] leading-relaxed">
                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span>Notificações inteligentes integradas em segundo plano se você estiver fora do app.</span>
                        </li>
                        <li className="flex items-start pl-4 text-[11px] leading-relaxed">
                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span>Visualizadores instantâneos em foco (push inside) sem interromper suas conversas.</span>
                        </li>
                        <li className="flex items-start pl-4 text-[11px] leading-relaxed">
                          <div className="w-1 h-1 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0" />
                          <span>Múltiplos testes dinâmicos de auto-atualização ao recuperar foco da aba.</span>
                        </li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full mt-2">
                <button 
                  className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-extrabold text-xs hover:scale-[1.02] active:scale-95 transition-all text-center shadow-lg shadow-black/10 dark:shadow-white/5" 
                  onClick={handleUpdate}
                >
                  🚀 Atualizar Agora
                </button>
                <button 
                  className="py-3 px-4 bg-gray-100 dark:bg-zinc-850 hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-650 dark:text-zinc-300 rounded-xl font-bold text-xs transition-colors" 
                  onClick={() => close()}
                >
                  Mais tarde
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  if (showUpToDate) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 z-[100] p-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 flex items-center space-x-4 min-w-[280px]"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900">Você está atualizado!</p>
            <p className="text-sm text-gray-500">Versão {APP_VERSION}</p>
          </div>
          <button 
            className="p-2 text-gray-400 hover:text-black transition-colors" 
            onClick={() => setShowUpToDate(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (offlineReady) {
    return null;
  }

  return null;
}
