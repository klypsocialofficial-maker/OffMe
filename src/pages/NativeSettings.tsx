import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Mic, MicOff, MapPin, Share2, Smartphone, 
  Fingerprint, Sparkles, Check, Download, ShieldCheck, 
  Activity, Zap, Info, Compass, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { triggerHaptic } from '../hooks/useHaptic';

// Supported SpeechRecognition types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export default function NativeSettings() {
  const navigate = useNavigate();
  const { userProfile, showToast } = useAuth();
  const { language } = useLanguage();

  // Localized dictionary for optimal translation compliance
  const t = (key: string): string => {
    const pt: Record<string, string> = {
      'native.title': 'Funcionalidades Nativas',
      'native.subtitle': 'Controle e gerencie a integração do OffMe com o hardware de seu dispositivo iOS ou Android.',
      'native.share.title': 'Compartilhamento Nativo',
      'native.share.desc': 'Abre a planilha de compartilhamento oficial do iOS/Android para divulgar o OffMe.',
      'native.share.btn': 'Compartilhar App',
      'native.share.success': 'Planilha de compartilhamento aberta!',
      'native.share.error': 'Seu navegador não oferece suporte ao compartilhamento nativo.',
      'native.haptic.title': 'Feedback Tátil (Haptics)',
      'native.haptic.desc': 'Sinta vibrações sutis ao interagir, postar ou receber notificações em seu dispositivo.',
      'native.haptic.btn.light': 'Vibração Leve',
      'native.haptic.btn.success': 'Confirmação',
      'native.haptic.btn.error': 'Alerta / Erro',
      'native.haptic.supported': 'Motor de vibração disponível',
      'native.haptic.unsupported': 'Vibração indisponível neste navegador',
      'native.gps.title': 'Localização por Satélite (GPS)',
      'native.gps.desc': 'Insira coordenadas em posts ou filtre tendências próximas a você usando o GPS nativo.',
      'native.gps.btn.get': 'Obter Coordenadas GPS',
      'native.gps.loading': 'Acessando satélites...',
      'native.gps.lat': 'Latitude',
      'native.gps.lng': 'Longitude',
      'native.gps.acc': 'Precisão',
      'native.voice.title': 'Ditado por Voz (Speech-to-Text)',
      'native.voice.desc': 'Use o microfone do seu smartphone para redigir posts sem precisar digitar.',
      'native.voice.btn.start': 'Iniciar Ditado',
      'native.voice.btn.stop': 'Parar Gravador',
      'native.voice.listening': 'Ouvindo você falar...',
      'native.voice.placeholder': 'O texto ditado aparecerá aqui...',
      'native.biometrics.title': 'Biometria Física (WebAuthn)',
      'native.biometrics.desc': 'Registre seu FaceID ou impressão digital para desbloquear o OffMe instantaneamente.',
      'native.biometrics.btn': 'Registrar Biometria',
      'native.biometrics.active': 'Proteção biométrica ativada!',
      'native.biometrics.modal.title': 'Scanner Biométrico Nativo',
      'native.biometrics.modal.desc': 'Coloque seu dedo no leitor de digital ou olhe para a câmera para FaceID.',
      'native.install.title': 'Aplicativo Nativo (PWA)',
      'native.install.desc': 'Adicione o OffMe à tela inicial do seu celular para rodar em tela cheia com alta velocidade.',
      'native.install.btn': 'Instalar Aplicativo',
      'native.install.ios_guide': 'No iOS/Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".'
    };

    const en: Record<string, string> = {
      'native.title': 'Native Integrations',
      'native.subtitle': 'Control and manage OffMe integration with your iOS or Android hardware APIs.',
      'native.share.title': 'Native Sharing',
      'native.share.desc': 'Opens the native iOS/Android system share sheet to spread the word about OffMe.',
      'native.share.btn': 'Share App',
      'native.share.success': 'Share sheet triggered successfully!',
      'native.share.error': 'Native sharing is not supported in this browser.',
      'native.haptic.title': 'Tactile Feedback (Haptics)',
      'native.haptic.desc': 'Feel physical structural vibrations when posting, navigating or interacting on mobile.',
      'native.haptic.btn.light': 'Light Tap',
      'native.haptic.btn.success': 'Success Beat',
      'native.haptic.btn.error': 'Error Rumble',
      'native.haptic.supported': 'Haptic engine active',
      'native.haptic.unsupported': 'Vibration API not supported',
      'native.gps.title': 'Satellite Geolocation (GPS)',
      'native.gps.desc': 'Tag high-precision device coordinates to posts or explore local neighborhood trends.',
      'native.gps.btn.get': 'Fetch GPS Coordinates',
      'native.gps.loading': 'Connecting with GPS...',
      'native.gps.lat': 'Latitude',
      'native.gps.lng': 'Longitude',
      'native.gps.acc': 'Accuracy',
      'native.voice.title': 'Voice Dictation (Speech-to-Text)',
      'native.voice.desc': 'Use your smartphone\'s native dictation system to compose post text easily.',
      'native.voice.btn.start': 'Start Dictating',
      'native.voice.btn.stop': 'Stop Dictation',
      'native.voice.listening': 'Listening to your voice...',
      'native.voice.placeholder': 'Dictated text will materialize here...',
      'native.biometrics.title': 'Biometric Security (WebAuthn)',
      'native.biometrics.desc': 'Register your TouchID, FaceID or device PIN to bypass auth screens securely.',
      'native.biometrics.btn': 'Configure Biometrics',
      'native.biometrics.active': 'Biometric protection active!',
      'native.biometrics.modal.title': 'Native Biometric Request',
      'native.biometrics.modal.desc': 'Place your finger on scanner or look directly at the front camera.',
      'native.install.title': 'Native App Experience (PWA)',
      'native.install.desc': 'Install OffMe on your home screen for rapid loading, standalone frame, and high speed.',
      'native.install.btn': 'Install Now',
      'native.install.ios_guide': 'On iOS/Safari, tap Share then select "Add to Home Screen".'
    };

    const es: Record<string, string> = {
      'native.title': 'Funcionalidades Nativas',
      'native.subtitle': 'Controla y gestiona la integración de OffMe con el hardware de tu dispositivo iOS o Android.',
      'native.share.title': 'Compartido Nativo',
      'native.share.desc': 'Abre la hoja de compartición oficial de iOS/Android para difundir OffMe.',
      'native.share.btn': 'Compartir App',
      'native.share.success': '¡Hoja de compartir nativa activada!',
      'native.share.error': 'El navegador no soporta el compartido nativo.',
      'native.haptic.title': 'Vibración Háptica (Haptics)',
      'native.haptic.desc': 'Siente vibraciones táctiles sutiles al interactuar, publicar o recibir alertas en tu móvil.',
      'native.haptic.btn.light': 'Toque Ligero',
      'native.haptic.btn.success': 'Éxito Doble',
      'native.haptic.btn.error': 'Alerta / Fallo',
      'native.haptic.supported': 'Motor háptico disponible',
      'native.haptic.unsupported': 'Vibración no soportada por el navegador',
      'native.gps.title': 'Localización Satelital (GPS)',
      'native.gps.desc': 'Inserta coordenadas GPS de alta precisión en tus posts o filtra contenido regional.',
      'native.gps.btn.get': 'Obtener Coordenadas GPS',
      'native.gps.loading': 'Localizando satélites...',
      'native.gps.lat': 'Latitud',
      'native.gps.lng': 'Longitud',
      'native.gps.acc': 'Precisión',
      'native.voice.title': 'Dictado por Voz (Speech-to-Text)',
      'native.voice.desc': 'Usa el micrófono de tu smartphone para redactar tus publicaciones cómodamente por voz.',
      'native.voice.btn.start': 'Iniciar Dictado',
      'native.voice.btn.stop': 'Terminar Dictado',
      'native.voice.listening': 'Escuchando tu voz...',
      'native.voice.placeholder': 'El texto dictado aparecerá aquí...',
      'native.biometrics.title': 'Biometría Física (WebAuthn)',
      'native.biometrics.desc': 'Registra tu huella dactilar o FaceID para desbloquear tu cuenta en segundos.',
      'native.biometrics.btn': 'Configurar Biometría',
      'native.biometrics.active': '¡Protección biométrica activa!',
      'native.biometrics.modal.title': 'Validación Biométrica Nativa',
      'native.biometrics.modal.desc': 'Coloque su dedo sobre el lector de huellas o mire a la cámara frontal.',
      'native.install.title': 'Aplicación de Escritorio (PWA)',
      'native.install.desc': 'Instala OffMe en tu pantalla de inicio para una experiencia súper veloz en pantalla completa.',
      'native.install.btn': 'Instalar Aplicación',
      'native.install.ios_guide': 'En iOS/Safari, toca Compartir y luego elige "Añadir a la Pantalla de Inicio".'
    };

    const dict = language === 'en' ? en : language === 'es' ? es : pt;
    return dict[key] || key;
  };

  // State managers
  const [isVibrateSupported, setIsVibrateSupported] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Voice Dictation
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Biometrics simulation
  const [biometricsActive, setBiometricsActive] = useState(() => {
    return localStorage.getItem('offme_biometrics_active') === 'true';
  });
  const [showBiometricScan, setShowBiometricScan] = useState(false);
  const [biometricScanState, setBiometricScanState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');

  // PWA setup
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check haptic support
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      setIsVibrateSupported(true);
    }

    // Check PWA Standalone
    const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone;
    setIsStandalone(!!standaloneMode);

    // Check iOS
    const isIOSDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(isIOSDevice);

    // Intercept BeforeInstallPrompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Initialize Web Speech API if supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'pt-BR';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setVoiceText(prev => prev + ' ' + finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          showToast(language === 'en' ? 'Microphone error' : 'Erro no microfone', 'error');
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognitionInstance(recognition);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, [language]);

  // Methods
  const handleNativeShare = async () => {
    triggerHaptic('selection');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OffMe',
          text: 'OffMe - A rede social ultra-fluida do amanhã!',
          url: window.location.origin
        });
        showToast(t('native.share.success'), 'success');
      } catch (err) {
        console.warn('Share dismissed or failed', err);
      }
    } else {
      showToast(t('native.share.error'), 'warning');
    }
  };

  const handleTestHaptic = (type: 'light' | 'success' | 'error') => {
    triggerHaptic(type);
    showToast(`${t('native.haptic.supported')}: ${type.toUpperCase()}`, 'success');
  };

  const fetchGPS = () => {
    triggerHaptic('selection');
    setGpsLoading(true);
    setGpsError(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy)
          });
          setGpsLoading(false);
          triggerHaptic('success');
          showToast(language === 'en' ? 'GPS coordinates acquired!' : 'Coordenadas GPS capturadas!', 'success');
        },
        (error) => {
          console.error(error);
          setGpsLoading(false);
          setGpsError(error.message);
          triggerHaptic('error');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setGpsLoading(false);
      setGpsError('GPS hardware not supported by this browser');
      triggerHaptic('error');
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognitionInstance) {
      showToast(language === 'en' ? 'Speech recognition not supported' : 'Reconhecimento de voz não suportado neste navegador', 'warning');
      return;
    }

    triggerHaptic('selection');
    if (isRecording) {
      recognitionInstance.stop();
      setIsRecording(false);
    } else {
      setVoiceText('');
      recognitionInstance.start();
      setIsRecording(true);
      showToast(t('native.voice.listening'), 'info');
    }
  };

  const handleRegisterBiometrics = () => {
    triggerHaptic('selection');
    if (biometricsActive) {
      localStorage.removeItem('offme_biometrics_active');
      setBiometricsActive(false);
      showToast(language === 'en' ? 'Biometrics login disabled.' : 'Login biométrico desativado.', 'info');
    } else {
      setShowBiometricScan(true);
      setBiometricScanState('scanning');
      triggerHaptic('medium');

      // Simulate native system WebAuthn biometric scanning
      setTimeout(() => {
        triggerHaptic('success');
        setBiometricScanState('success');
        setTimeout(() => {
          localStorage.setItem('offme_biometrics_active', 'true');
          setBiometricsActive(true);
          setShowBiometricScan(false);
          showToast(t('native.biometrics.active'), 'success');
        }, 1200);
      }, 2500);
    }
  };

  const triggerInstallPWA = async () => {
    triggerHaptic('selection');
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        showToast(language === 'en' ? 'Installation complete!' : 'Instalação iniciada!', 'success');
      }
    } else {
      showToast(t('native.install.ios_guide'), 'info');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-gray-50/50 dark:bg-zinc-950 pb-12 transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border-b border-gray-150 dark:border-zinc-800 shadow-sm pt-[env(safe-area-inset-top)]">
        <div className="px-4 py-3 flex items-center space-x-4">
          <button 
            onClick={() => navigate('/settings')} 
            className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-gray-100" />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter text-gray-900 dark:text-white">
              {t('native.title')}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <p className="text-xs text-gray-500 dark:text-zinc-400">
          {t('native.subtitle')}
        </p>

        {/* 1. COMPARTILHAMENTO NATIVO */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-2xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                {t('native.share.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {t('native.share.desc')}
              </p>
            </div>
          </div>
          <button
            onClick={handleNativeShare}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {t('native.share.btn')}
          </button>
        </section>

        {/* 2. FEEDBACK TÁTIL (HAPTICS) */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 text-purple-500 rounded-2xl">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                {t('native.haptic.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {t('native.haptic.desc')}
              </p>
              <div className="mt-2.5 flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{isVibrateSupported ? t('native.haptic.supported') : t('native.haptic.unsupported')}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handleTestHaptic('light')}
              className="py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold rounded-xl text-xs transition-colors border border-gray-100 dark:border-zinc-800"
            >
              {t('native.haptic.btn.light')}
            </button>
            <button
              onClick={() => handleTestHaptic('success')}
              className="py-2.5 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-xl text-xs transition-colors border border-emerald-100/50 dark:border-emerald-900/50"
            >
              {t('native.haptic.btn.success')}
            </button>
            <button
              onClick={() => handleTestHaptic('error')}
              className="py-2.5 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-colors border border-rose-100/50 dark:border-rose-900/50"
            >
              {t('native.haptic.btn.error')}
            </button>
          </div>
        </section>

        {/* 3. DITADO POR VOZ (STT) */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className={`p-3 rounded-2xl transition-all ${isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-500'}`}>
              <Mic className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                {t('native.voice.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {t('native.voice.desc')}
              </p>
            </div>
          </div>

          <div className="relative">
            <textarea
              readOnly
              value={voiceText}
              placeholder={isRecording ? t('native.voice.listening') : t('native.voice.placeholder')}
              className="w-full h-24 bg-gray-50 dark:bg-zinc-850 border border-gray-100 dark:border-zinc-800 rounded-2xl p-3 text-xs outline-none text-gray-800 dark:text-zinc-200 resize-none font-medium leading-relaxed placeholder-gray-400"
            />
            {isRecording && (
              <div className="absolute right-3 bottom-3 flex items-center space-x-1">
                {[0, 1, 2, 3].map((wave) => (
                  <span 
                    key={wave} 
                    className="w-0.5 h-3.5 bg-rose-500 rounded-full animate-bounce" 
                    style={{ animationDelay: `${wave * 0.15}s`, animationDuration: '0.8s' }} 
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleVoiceRecording}
            className={`w-full py-3 font-extrabold rounded-2xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 ${
              isRecording 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isRecording ? t('native.voice.btn.stop') : t('native.voice.btn.start')}
          </button>
        </section>

        {/* 4. LOCALIZAÇÃO POR SATÉLITE (GPS) */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded-2xl">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                {t('native.gps.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {t('native.gps.desc')}
              </p>
            </div>
          </div>

          {gpsCoords && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl grid grid-cols-3 gap-3 text-center"
            >
              <div>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold uppercase block">{t('native.gps.lat')}</span>
                <span className="text-xs text-gray-900 dark:text-white font-mono font-bold">{gpsCoords.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold uppercase block">{t('native.gps.lng')}</span>
                <span className="text-xs text-gray-900 dark:text-white font-mono font-bold">{gpsCoords.longitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-extrabold uppercase block">{t('native.gps.acc')}</span>
                <span className="text-xs text-gray-900 dark:text-white font-mono font-bold">±{gpsCoords.accuracy}m</span>
              </div>
            </motion.div>
          )}

          {gpsError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100/50 dark:border-red-900/50 rounded-2xl text-xs text-red-600 dark:text-red-400 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          <button
            onClick={fetchGPS}
            disabled={gpsLoading}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {gpsLoading ? t('native.gps.loading') : t('native.gps.btn.get')}
          </button>
        </section>

        {/* 5. PROTEÇÃO BIOMÉTRICA (WEBAUTHN) */}
        <section className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-2xl">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight">
                {t('native.biometrics.title')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {t('native.biometrics.desc')}
              </p>
              {biometricsActive && (
                <div className="mt-2.5 flex items-center space-x-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{t('native.biometrics.active')}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleRegisterBiometrics}
            className={`w-full py-3 font-extrabold rounded-2xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 ${
              biometricsActive
                ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100/50 dark:border-red-900/30'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            {biometricsActive 
              ? (language === 'en' ? 'Remove Biometrics' : 'Desativar Biometria') 
              : t('native.biometrics.btn')}
          </button>
        </section>

        {/* 6. INSTALAÇÃO DO PWA */}
        <section className="bg-gradient-to-br from-gray-900 to-black text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
          <div className="absolute -left-12 -top-12 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 bg-white/10 text-white rounded-2xl border border-white/10">
                <Download className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white tracking-tight">
                  {t('native.install.title')}
                </h2>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  {t('native.install.desc')}
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-xs text-zinc-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">
                {isIOS ? t('native.install.ios_guide') : 'Compatível nativamente com Chrome, Safari, Edge e navegadores Android/iOS.'}
              </p>
            </div>

            {(!isIOS || installPrompt) && (
              <button
                onClick={triggerInstallPWA}
                disabled={isStandalone}
                className="w-full py-3.5 bg-white hover:bg-zinc-100 text-black font-extrabold rounded-2xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4 fill-black text-black" />
                {isStandalone ? 'OffMe Já Instalado' : t('native.install.btn')}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Futuristic Biometric FaceID/Fingerprint scanning dialog */}
      <AnimatePresence>
        {showBiometricScan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 animate-pulse" />

              <div className="flex flex-col items-center">
                {/* Visual scanner ring */}
                <div className="w-24 h-24 rounded-full border-2 border-emerald-500/20 flex items-center justify-center relative mb-2">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                    className="absolute inset-1.5 border border-dashed border-emerald-500/40 rounded-full"
                  />
                  <div className="w-16 h-16 bg-emerald-500/5 rounded-full flex items-center justify-center text-emerald-400 relative z-10">
                    <Fingerprint className="w-9 h-9 animate-pulse" />
                  </div>

                  {biometricScanState === 'scanning' && (
                    <motion.div 
                      initial={{ y: -40 }}
                      animate={{ y: 40 }}
                      transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-x-4 h-0.5 bg-emerald-400 shadow-md shadow-emerald-400/50 z-20"
                    />
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-xl text-white tracking-tight">
                  {t('native.biometrics.modal.title')}
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-[240px] mx-auto">
                  {biometricScanState === 'scanning' 
                    ? t('native.biometrics.modal.desc') 
                    : (language === 'en' ? 'Biometrics registered successfully!' : 'Identificação biométrica registrada com sucesso!')}
                </p>
              </div>

              {biometricScanState === 'success' ? (
                <div className="flex items-center justify-center text-emerald-400 gap-2 font-bold text-sm bg-emerald-500/10 py-2.5 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{language === 'en' ? 'Access Granted' : 'Acesso Concedido'}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2.5 text-[10px] uppercase font-black tracking-widest text-zinc-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>{language === 'en' ? 'Awaiting hardware...' : 'Aguardando hardware...'}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
