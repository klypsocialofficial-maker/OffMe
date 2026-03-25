import React, { useState } from 'react';
import { ArrowLeft, Check, Search, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageSettings() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const languages = [
    { id: 'en', name: 'English', native: 'English' },
    { id: 'pt', name: 'Portuguese', native: 'Português' },
    { id: 'es', name: 'Spanish', native: 'Español' },
    { id: 'fr', name: 'French', native: 'Français' },
    { id: 'de', name: 'German', native: 'Deutsch' },
    { id: 'it', name: 'Italian', native: 'Italiano' },
    { id: 'ja', name: 'Japanese', native: '日本語' },
    { id: 'ko', name: 'Korean', native: '한국어' },
    { id: 'zh', name: 'Chinese', native: '中文' },
    { id: 'ru', name: 'Russian', native: 'Русский' },
    { id: 'ar', name: 'Arabic', native: 'العربية' },
    { id: 'hi', name: 'Hindi', native: 'हिन्दी' },
  ] as const;

  const filteredLanguages = languages.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.native.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = () => {
    setLanguage(selectedLanguage);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <div>
          <h2 className="text-xl font-black tracking-tight">{t('language')}</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('select_your_preference') || 'Select your preference'}</p>
        </div>
      </div>

      <div className="p-6">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
          <input 
            type="text" 
            placeholder={t('search_languages') || 'Search languages'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold tracking-tight focus:ring-2 focus:ring-black/5 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          {filteredLanguages.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setSelectedLanguage(lang.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                selectedLanguage === lang.id ? "bg-black text-white shadow-lg" : "hover:bg-gray-50"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  selectedLanguage === lang.id ? "bg-white/10" : "bg-gray-50 group-hover:bg-white"
                )}>
                  <Globe className={cn(
                    "w-5 h-5",
                    selectedLanguage === lang.id ? "text-white" : "text-gray-400 group-hover:text-black"
                  )} />
                </div>
                <div className="text-left">
                  <p className="font-black tracking-tight">{lang.native}</p>
                  <p className={cn(
                    "text-xs font-medium",
                    selectedLanguage === lang.id ? "text-gray-400" : "text-gray-400"
                  )}>{lang.name}</p>
                </div>
              </div>
              {selectedLanguage === lang.id && (
                <Check className="w-5 h-5 text-white" />
              )}
            </button>
          ))}

          {filteredLanguages.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-gray-400 font-medium">{t('no_languages_found') || 'No languages found'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-100 sm:static sm:bg-transparent sm:border-none">
        <button 
          onClick={handleSave}
          className="w-full py-4 bg-black text-white rounded-full font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl"
        >
          {t('save_changes')}
        </button>
      </div>
    </div>
  );
}
