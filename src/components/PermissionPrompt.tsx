import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Camera, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PermissionPrompt() {
  const { userProfile, requestNotificationPermission } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<'notifications' | 'camera'>('notifications');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    
    // Check if notification permission is needed
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Delay showing to not startle the user
        const timer = setTimeout(() => setShow(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [userProfile]);

  const handleNotificationRequest = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setStep('camera');
    } else {
      // Even if denied or dismissed, we move on for now or close
      setStep('camera');
    }
  };

  const handleCameraAcknowledge = () => {
    // Since camera is used via File Input, we just ensure metadata is set (done)
    // and tell the user they can use it to post.
    setCompleted(true);
    setTimeout(() => setShow(false), 2000);
  };

  if (!show || !userProfile) return null;

  return (
    <AnimatePresence>
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[100]">
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.9 }}
          className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 flex flex-col items-center text-center liquid-glass-card"
        >
          <button 
            onClick={() => setShow(false)}
            className="absolute top-3 right-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>

          {!completed ? (
            <>
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                {step === 'notifications' ? (
                  <Bell className="w-7 h-7 text-blue-500 animate-bounce" />
                ) : (
                  <Camera className="w-7 h-7 text-emerald-500" />
                )}
              </div>
              
              <h3 className="font-bold text-lg text-black mb-2">
                {step === 'notifications' ? 'Fique por dentro!' : 'Capture momentos'}
              </h3>
              
              <p className="text-gray-500 text-sm mb-6 px-4">
                {step === 'notifications' 
                  ? 'Ative as notificações para saber quando alguém responder, curtir ou mencionar você.' 
                  : 'O OffMe pode usar sua câmera para você postar fotos e vídeos diretamente do seu celular.'}
              </p>

              <div className="flex flex-col w-full space-y-2">
                <button
                  onClick={step === 'notifications' ? handleNotificationRequest : handleCameraAcknowledge}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${
                    step === 'notifications' 
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-200' 
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200'
                  }`}
                >
                  {step === 'notifications' ? 'Ativar Notificações' : 'Entendido!'}
                </button>
                <button
                  onClick={() => {
                    if (step === 'notifications') setStep('camera');
                    else setShow(false);
                  }}
                  className="w-full py-2 text-gray-400 font-medium text-xs hover:text-gray-600"
                >
                  Agora não
                </button>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="font-bold text-lg text-black">Tudo pronto!</h3>
              <p className="text-gray-500 text-sm">Sua experiência agora está completa.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
