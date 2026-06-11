import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  translateText: (text: string, targetLanguage?: Language) => Promise<string>;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Nav items
    'nav.home': 'Início',
    'nav.explore': 'Explorar',
    'nav.profile': 'Perfil',
    'nav.post': 'Postar',
    'nav.notifications': 'Notificações',
    'nav.messages': 'Mensagens',
    'nav.communities': 'Comunidades',
    'nav.creation': 'Criação',
    'nav.missions': 'Missões',
    'nav.shop': 'Loja',
    'nav.premium': 'Premium',
    'nav.bookmarks': 'Itens salvos',
    'nav.drafts': 'Rascunhos Offline',
    'nav.circle': 'Círculo',
    'nav.settings': 'Configurações',
    'post.reading_time': '{time} min de leitura',
    
    // Settings main panel
    'settings.title': 'Configurações',
    'settings.notifications.title': 'Notificações Push',
    'settings.notifications.description': 'Receba alertas de novas atividades.',
    'settings.notifications.enabled': 'Ativado',
    'settings.notifications.enable': 'Ativar',
    'settings.notifications.alert': 'Para desativar as notificações, altere as permissões nas configurações do seu navegador.',
    'settings.account.title': 'Sua conta',
    'settings.account.description': 'Veja informações sobre sua conta, altere seu e-mail, senha ou nome de usuário.',
    'settings.privacy.title': 'Privacidade e segurança',
    'settings.privacy.description': 'Gerencie as informações que você vê e compartilha no OffMe.',
    'settings.display.title': 'Acessibilidade, exibição e idiomas',
    'settings.display.description': 'Gerencie como o conteúdo do OffMe é exibido para você.',
    'settings.updates.title': 'Verificar atualizações',
    'settings.updates.description': 'Toque aqui para verificar se há uma nova versão do OffMe disponível.',
    
    // Display & Language page
    'display.title': 'Exibição & Idioma',
    'display.theme.section': 'Tema',
    'display.theme.light.label': 'Modo Claro',
    'display.theme.light.desc': 'Luz para o dia',
    'display.theme.dark.label': 'Modo Escuro',
    'display.theme.dark.desc': 'Conforto visual',
    'display.theme.amoled.label': 'Amoled Black',
    'display.theme.amoled.desc': 'Preto puro (OLED)',
    'display.theme.system.label': 'Sistema',
    'display.theme.system.desc': 'Segue o dispositivo',
    'display.theme.cyberpunk.label': 'Cyberpunk 2077',
    'display.theme.cyberpunk.desc': 'Futurista & Neon vibrante',
    'display.theme.dark_gold.label': 'Luxo Real',
    'display.theme.dark_gold.desc': 'Preto sóbrio & Ouro reluzente',
    'display.theme.liquid_glass.label': 'Liquid Glass (iOS 26)',
    'display.theme.liquid_glass.desc': 'Vidro cristalino & Fluidez orgânica',
    
    // Language Section
    'display.lang.section': 'Idioma',
    'display.lang.desc': 'Escolha o idioma preferido do aplicativo.',
    'display.lang.pt': 'Português',
    'display.lang.en': 'English',
    'display.lang.es': 'Español',
  },
  en: {
    // Nav items
    'nav.home': 'Home',
    'nav.explore': 'Explore',
    'nav.profile': 'Profile',
    'nav.post': 'Post',
    'nav.notifications': 'Notifications',
    'nav.messages': 'Messages',
    'nav.communities': 'Communities',
    'nav.creation': 'Creation',
    'nav.missions': 'Missions',
    'nav.shop': 'Shop',
    'nav.premium': 'Premium',
    'nav.bookmarks': 'Saved Items',
    'nav.drafts': 'Offline Drafts',
    'nav.circle': 'Circle',
    'nav.settings': 'Settings',
    'post.reading_time': '{time} min read',
    
    // Settings main panel
    'settings.title': 'Settings',
    'settings.notifications.title': 'Push Notifications',
    'settings.notifications.description': 'Get alerts when new activities happen.',
    'settings.notifications.enabled': 'Enabled',
    'settings.notifications.enable': 'Enable',
    'settings.notifications.alert': 'To disable notifications, change permissions in your browser settings.',
    'settings.account.title': 'Your account',
    'settings.account.description': 'View your account information, change your email, password, or username.',
    'settings.privacy.title': 'Privacy and security',
    'settings.privacy.description': 'Manage the information you see and share on OffMe.',
    'settings.display.title': 'Accessibility, display, and languages',
    'settings.display.description': 'Manage how OffMe content is displayed to you.',
    'settings.updates.title': 'Check for updates',
    'settings.updates.description': 'Tap here to check for available updates of OffMe.',
    
    // Display & Language page
    'display.title': 'Display & Language',
    'display.theme.section': 'Theme',
    'display.theme.light.label': 'Light Mode',
    'display.theme.light.desc': 'Daytime light',
    'display.theme.dark.label': 'Dark Mode',
    'display.theme.dark.desc': 'Visual comfort',
    'display.theme.amoled.label': 'Amoled Black',
    'display.theme.amoled.desc': 'Pure Black (OLED)',
    'display.theme.system.label': 'System',
    'display.theme.system.desc': 'Matches your device setting',
    'display.theme.cyberpunk.label': 'Cyberpunk 2077',
    'display.theme.cyberpunk.desc': 'Futuristic & vibrant Neon',
    'display.theme.dark_gold.label': 'Royal Luxury',
    'display.theme.dark_gold.desc': 'Sober black & shiny Gold',
    'display.theme.liquid_glass.label': 'Liquid Glass (iOS 26)',
    'display.theme.liquid_glass.desc': 'Crystal glass & organic fluid motion',
    
    // Language Section
    'display.lang.section': 'Language',
    'display.lang.desc': 'Choose your preferred language for the application.',
    'display.lang.pt': 'Portuguese',
    'display.lang.en': 'English',
    'display.lang.es': 'Spanish',
  },
  es: {
    // Nav items
    'nav.home': 'Inicio',
    'nav.explore': 'Explorar',
    'nav.profile': 'Perfil',
    'nav.post': 'Publicar',
    'nav.notifications': 'Notificaciones',
    'nav.messages': 'Mensajes',
    'nav.communities': 'Comunidades',
    'nav.creation': 'Creación',
    'nav.missions': 'Misiones',
    'nav.shop': 'Tienda',
    'nav.premium': 'Premium',
    'nav.bookmarks': 'Elementos guardados',
    'nav.drafts': 'Borradores Offline',
    'nav.circle': 'Círculo',
    'nav.settings': 'Configuración',
    'post.reading_time': '{time} min de lectura',
    
    // Settings main panel
    'settings.title': 'Configuración',
    'settings.notifications.title': 'Notificaciones Push',
    'settings.notifications.description': 'Recibe alertas de nuevas actividades.',
    'settings.notifications.enabled': 'Activado',
    'settings.notifications.enable': 'Activar',
    'settings.notifications.alert': 'Para desactivar las notificaciones, cambie los permisos en la configuración de su navegador.',
    'settings.account.title': 'Su cuenta',
    'settings.account.description': 'Ver detalles de su cuenta, cambie su correo, contraseña o nombre de usuario.',
    'settings.privacy.title': 'Privacidad y seguridad',
    'settings.privacy.description': 'Gestione la información que ve y comparte en OffMe.',
    'settings.display.title': 'Accesibilidad, visualización e idiomas',
    'settings.display.description': 'Gestione cómo se le muestra el contenido de OffMe.',
    'settings.updates.title': 'Buscar actualizaciones',
    'settings.updates.description': 'Pulse aquí para comprobar si hay una nueva versión de OffMe disponible.',
    
    // Display & Language page
    'display.title': 'Visualización e Idioma',
    'display.theme.section': 'Tema',
    'display.theme.light.label': 'Modo Claro',
    'display.theme.light.desc': 'Luz para el día',
    'display.theme.dark.label': 'Modo Oscuro',
    'display.theme.dark.desc': 'Confort visual',
    'display.theme.amoled.label': 'Amoled Black',
    'display.theme.amoled.desc': 'Negro puro (OLED)',
    'display.theme.system.label': 'Sistema',
    'display.theme.system.desc': 'Sigue la opción del dispositivo',
    'display.theme.cyberpunk.label': 'Cyberpunk 2077',
    'display.theme.cyberpunk.desc': 'Futurista y Neón vibrante',
    'display.theme.dark_gold.label': 'Lujo Real',
    'display.theme.dark_gold.desc': 'Negro sobrio y Oro brillante',
    'display.theme.liquid_glass.label': 'Liquid Glass (iOS 26)',
    'display.theme.liquid_glass.desc': 'Vidrio cristalino y fluidez orgánica',
    
    // Language Section
    'display.lang.section': 'Idioma',
    'display.lang.desc': 'Elija su idioma preferido para la aplicación.',
    'display.lang.pt': 'Portugués',
    'display.lang.en': 'Inglés',
    'display.lang.es': 'Español',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved === 'en' || saved === 'es' || saved === 'pt' ? saved : 'pt';
  });

  // Sync state if userProfile's language changes
  useEffect(() => {
    if (userProfile?.language && (userProfile.language === 'pt' || userProfile.language === 'en' || userProfile.language === 'es')) {
      if (userProfile.language !== language) {
        setLanguageState(userProfile.language as Language);
        localStorage.setItem('language', userProfile.language);
      }
    }
  }, [userProfile?.language]);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);

    // Sync database user profile
    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { language: lang });
      } catch (err) {
        console.error('Failed to sync language settings with user profile:', err);
      }
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['pt'][key] || key;
  };

  const translateText = async (text: string, targetLanguage: Language = language): Promise<string> => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, targetLanguage }),
      });
      if (!response.ok) {
        throw new Error('API translation endpoint returned non-OK answer.');
      }
      const data = await response.json();
      return data.translatedText || text;
    } catch (err) {
      console.warn('API translation failed, using original source text as fallback:', err);
      return text;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
