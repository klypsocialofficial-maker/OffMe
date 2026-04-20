import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // Check if we've shown it before
    const hasSeenPrompt = localStorage.getItem('offme_install_prompt_seen');
    if (hasSeenPrompt) {
      return;
    }

    // Check if it's an iOS device (for manual instructions if wanted, but for now we focus on standard PWA)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait a bit before showing to not clash with splash screen
      setTimeout(() => setShowPrompt(true), 1500); 
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, beforeinstallprompt doesn't fire, so we can manually show an instructional prompt if we want,
    // but the prompt asked specifically for when clicking install. Let's just show a custom UI if iOS.
    if (isIOSDevice) {
        setTimeout(() => setShowPrompt(true), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    }
    closePrompt();
  };

  const closePrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('offme_install_prompt_seen', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6 flex flex-col items-center text-center"
        >
          <button 
            onClick={closePrompt}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 mt-2">
            <Download className="w-8 h-8 text-blue-500" />
          </div>

          <h3 className="font-black text-2xl text-gray-900 mb-2">
            Instalar o OffMe
          </h3>
          <p className="text-gray-500 mb-6 font-medium text-sm leading-relaxed">
            {isIOS && !deferredPrompt 
              ? "Para instalar no iOS, toque no botão de compartilhar do Safari e depois em 'Adicionar à Tela de Início'." 
              : "Adicione o OffMe à sua tela inicial para uma experiência mais rápida, fluida e em tela cheia!"}
          </p>

          <div className="w-full flex flex-col space-y-3">
            {(!isIOS || deferredPrompt) && (
              <button 
                onClick={handleInstallClick}
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-900 transition-colors active:scale-95 shadow-lg"
              >
                Instalar Agora
              </button>
            )}
            <button 
              onClick={closePrompt}
              className="w-full py-3 text-gray-500 hover:text-black font-bold transition-colors"
            >
              Agora não
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
