import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'pt' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'ru' | 'ar' | 'hi';

interface Translations {
  [key: string]: {
    [key in Language]?: string;
  };
}

export const translations: Translations = {
  home: { en: 'Home', pt: 'Início', es: 'Inicio', fr: 'Accueil', de: 'Startseite', it: 'Home', ja: 'ホーム', ko: '홈', zh: '首页', ru: 'Главная', ar: 'الرئيسية', hi: 'होम' },
  explore: { en: 'Explore', pt: 'Explorar', es: 'Explorar', fr: 'Explorer', de: 'Entdecken', it: 'Esplora', ja: '探索', ko: '탐색', zh: '探索', ru: 'Исследовать', ar: 'استكشاف', hi: 'एक्सप्लोर करें' },
  notifications: { en: 'Notifications', pt: 'Notificações', es: 'Notificaciones', fr: 'Notifications', de: 'Benachrichtigungen', it: 'Notifiche', ja: '通知', ko: '알림', zh: '通知', ru: 'Уведомления', ar: 'الإشعارات', hi: 'सूचनाएं' },
  messages: { en: 'Messages', pt: 'Mensagens', es: 'Mensajes', fr: 'Messages', de: 'Nachrichten', it: 'Messaggi', ja: 'メッセージ', ko: '메시지', zh: '消息', ru: 'Сообщения', ar: 'الرسائل', hi: 'संदेश' },
  bookmarks: { en: 'Bookmarks', pt: 'Itens Salvos', es: 'Guardados', fr: 'Signets', de: 'Lesezeichen', it: 'Segnalibri', ja: 'ブックマーク', ko: '북마크', zh: '书签', ru: 'Закладки', ar: 'الإشارات المرجعية', hi: 'बुकमार्क' },
  lists: { en: 'Lists', pt: 'Listas', es: 'Listas', fr: 'Listes', de: 'Listen', it: 'Liste', ja: 'リスト', ko: '리스트', zh: '列表', ru: 'Списки', ar: 'القوائم', hi: 'सूचियां' },
  communities: { en: 'Communities', pt: 'Comunidades', es: 'Comunidades', fr: 'Communautés', de: 'Communities', it: 'Community', ja: 'コミュニティ', ko: '커뮤니티', zh: '社区', ru: 'Сообщества', ar: 'المجتمعات', hi: 'समुदाय' },
  verified: { en: 'Verified', pt: 'Verificado', es: 'Verificado', fr: 'Vérifié', de: 'Verifiziert', it: 'Verificato', ja: '認証済み', ko: '인증됨', zh: '已认证', ru: 'Подтверждено', ar: 'موثق', hi: 'सत्यापित' },
  profile: { en: 'Profile', pt: 'Perfil', es: 'Perfil', fr: 'Profil', de: 'Profil', it: 'Profilo', ja: 'プロフィール', ko: '프로필', zh: '个人资料', ru: 'Профиль', ar: 'الملف الشخصي', hi: 'प्रोफ़ाइल' },
  settings: { en: 'Settings', pt: 'Configurações', es: 'Configuración', fr: 'Paramètres', de: 'Einstellungen', it: 'Impostazioni', ja: '設定', ko: '설정', zh: '设置', ru: 'Настройки', ar: 'الإعدادات', hi: 'सेटिंग्स' },
  post: { en: 'Post', pt: 'Postar', es: 'Postear', fr: 'Poster', de: 'Posten', it: 'Posta', ja: 'ポスト', ko: '게시', zh: '发布', ru: 'Опубликовать', ar: 'نشر', hi: 'पोस्ट करें' },
  logout: { en: 'Logout', pt: 'Sair', es: 'Cerrar sesión', fr: 'Déconnexion', de: 'Abmelden', it: 'Logout', ja: 'ログアウト', ko: '로그아웃', zh: '登出', ru: 'Выйти', ar: 'تسجيل الخروج', hi: 'लॉगआउट' },
  search: { en: 'Search', pt: 'Pesquisar', es: 'Buscar', fr: 'Rechercher', de: 'Suchen', it: 'Cerca', ja: '検索', ko: '검색', zh: '搜索', ru: 'Поиск', ar: 'بحث', hi: 'खोजें' },
  accessibility: { en: 'Accessibility', pt: 'Acessibilidade', es: 'Accesibilidade', fr: 'Accessibilité', de: 'Barrierefreiheit', it: 'Accessibilità', ja: 'アクセシビリティ', ko: '접근성', zh: '辅助功能', ru: 'Доступность', ar: 'إمكانية الوصول', hi: 'एक्सेसिबिलिटी' },
  language: { en: 'Language', pt: 'Idioma', es: 'Idioma', fr: 'Langue', de: 'Sprache', it: 'Lingua', ja: '言語', ko: '언어', zh: '语言', ru: 'Язык', ar: 'اللغة', hi: 'भाषा' },
  save_changes: { en: 'Save Changes', pt: 'Salvar Alterações', es: 'Guardar cambios', fr: 'Enregistrer', de: 'Speichern', it: 'Salva modifiche', ja: '変更を保存', ko: '변경사항 저장', zh: '保存更改', ru: 'Сохранить', ar: 'حفظ التغييرات', hi: 'परिवर्तन सहेजें' },
  loading: { en: 'Loading...', pt: 'Carregando...', es: 'Cargando...', fr: 'Chargement...', de: 'Laden...', it: 'Caricamento...', ja: '読み込み中...', ko: '로딩 중...', zh: '加载中...', ru: 'Загрузка...', ar: 'جارٍ التحميل...', hi: 'लोड हो रहा है...' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
