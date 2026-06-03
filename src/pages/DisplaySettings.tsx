import React from 'react';
import { ArrowLeft, Moon, Sun, Monitor, Check, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function DisplaySettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { userProfile, showToast } = useAuth();

  const themeOptions = [
    { id: 'light', label: 'Modo Claro', icon: Sun, description: 'Luz para o dia', isPremium: false, storeId: '' },
    { id: 'dark', label: 'Modo Escuro', icon: Moon, description: 'Conforto visual', isPremium: false, storeId: '' },
    { id: 'amoled', label: 'Amoled Black', icon: Moon, description: 'Preto puro (OLED)', isPremium: false, storeId: '' },
    { id: 'system', label: 'Sistema', icon: Monitor, description: 'Segue o dispositivo', isPremium: false, storeId: '' },
    { id: 'cyberpunk', label: 'Cyberpunk 2077', icon: Sparkles, description: 'Futurista & Neon vibrante', isPremium: true, storeId: 'theme_cyberpunk' },
    { id: 'dark_gold', label: 'Luxo Real', icon: Sparkles, description: 'Preto sóbrio & Ouro reluzente', isPremium: true, storeId: 'theme_dark_gold' },
  ] as const;

  const handleThemeSelect = (option: typeof themeOptions[number]) => {
    if (option.isPremium) {
      const isUnlocked = userProfile?.inventory?.includes(option.storeId);
      if (!isUnlocked) {
        showToast('Tema exclusivo! Desbloqueie na OffMe Store.', 'info');
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
          <h1 className="text-xl font-black tracking-tight">Exibição</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <section>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Tema</h2>
          <div className="space-y-2">
            {themeOptions.map((option) => {
              const isLocked = option.isPremium && !userProfile?.inventory?.includes(option.storeId);
              return (
                <button
                  key={option.id}
                  onClick={() => handleThemeSelect(option)}
                  className={`w-full p-4 bg-white rounded-2xl border flex items-center justify-between transition-all ${
                    theme === option.id ? 'border-black shadow-sm' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${theme === option.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                        <span>{option.label}</span>
                        {option.isPremium && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                            Premium
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-gray-500">{option.description}</p>
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
