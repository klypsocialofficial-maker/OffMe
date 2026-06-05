import React from 'react';
import { ArrowLeft, Moon, Sun, Monitor, Check, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, Language } from '../contexts/LanguageContext';

export default function DisplaySettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { userProfile, showToast } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const themeOptions = [
    { id: 'light', labelKey: 'display.theme.light.label', icon: Sun, descriptionKey: 'display.theme.light.desc', isPremium: false, storeId: '' },
    { id: 'dark', labelKey: 'display.theme.dark.label', icon: Moon, descriptionKey: 'display.theme.dark.desc', isPremium: false, storeId: '' },
    { id: 'amoled', labelKey: 'display.theme.amoled.label', icon: Moon, descriptionKey: 'display.theme.amoled.desc', isPremium: false, storeId: '' },
    { id: 'system', labelKey: 'display.theme.system.label', icon: Monitor, descriptionKey: 'display.theme.system.desc', isPremium: false, storeId: '' },
    { id: 'cyberpunk', labelKey: 'display.theme.cyberpunk.label', icon: Sparkles, descriptionKey: 'display.theme.cyberpunk.desc', isPremium: true, storeId: 'theme_cyberpunk' },
    { id: 'dark_gold', labelKey: 'display.theme.dark_gold.label', icon: Sparkles, descriptionKey: 'display.theme.dark_gold.desc', isPremium: true, storeId: 'theme_dark_gold' },
  ] as const;

  const handleThemeSelect = (option: typeof themeOptions[number]) => {
    if (option.isPremium) {
      const isUnlocked = userProfile?.inventory?.includes(option.storeId);
      if (!isUnlocked) {
        showToast(
          language === 'pt' 
            ? 'Tema exclusivo! Desbloqueie na OffMe Store.' 
            : language === 'es'
              ? '¡Tema exclusivo! Desbloquéalo en la tienda OffMe.'
              : 'Exclusive theme! Unlock in the OffMe Store.', 
          'info'
        );
        navigate('/shop');
        return;
      }
    }
    setTheme(option.id);
  };

  return (
    <div className="w-full h-full bg-transparent">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)] border-gray-100">
        <div className="px-4 py-3 flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black tracking-tight">{t('display.title')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-8">
        {/* Language Switcher Section */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1 px-1">
            {t('display.lang.section')}
          </h2>
          <p className="text-xs text-gray-500 mb-3 px-1">
            {t('display.lang.desc')}
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {[
              { id: 'pt', label: t('display.lang.pt'), flag: '🇧🇷', desc: 'Português (Brasil)' },
              { id: 'en', label: t('display.lang.en'), flag: '🇺🇸', desc: 'English (US)' },
              { id: 'es', label: t('display.lang.es'), flag: '🇪🇸', desc: 'Español' },
            ].map((langOption) => (
              <button
                key={langOption.id}
                onClick={() => setLanguage(langOption.id as Language)}
                className={`w-full p-4 bg-white rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  language === langOption.id ? 'border-black shadow-sm bg-gray-50/50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full text-lg w-10 h-10 flex items-center justify-center ${language === langOption.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <span>{langOption.flag}</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">{langOption.label}</h3>
                    <p className="text-xs text-gray-500">{langOption.desc}</p>
                  </div>
                </div>
                {language === langOption.id && (
                  <Check className="w-5 h-5 text-black" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Theme Settings Section */}
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">
            {t('display.theme.section')}
          </h2>
          <div className="space-y-2">
            {themeOptions.map((option) => {
              const isLocked = option.isPremium && !userProfile?.inventory?.includes(option.storeId);
              const label = t(option.labelKey);
              const description = t(option.descriptionKey);

              return (
                <button
                  key={option.id}
                  onClick={() => handleThemeSelect(option)}
                  className={`w-full p-4 bg-white rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    theme === option.id ? 'border-black shadow-sm' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${theme === option.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                        <span>{label}</span>
                        {option.isPremium && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase animate-pulse">
                            Premium
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                  </div>
                  {theme === option.id ? (
                    <Check className="w-5 h-5 text-black" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
