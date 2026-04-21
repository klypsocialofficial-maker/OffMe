import React from 'react';
import { ArrowLeft, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function DisplaySettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { id: 'light', label: 'Modo Claro', icon: Sun, description: 'Luz para o dia' },
    { id: 'dark', label: 'Modo Escuro', icon: Moon, description: 'Conforto visual' },
    { id: 'amoled', label: 'Amoled Black', icon: Moon, description: 'Preto puro (OLED)' },
    { id: 'system', label: 'Sistema', icon: Monitor, description: 'Segue o dispositivo' },
  ] as const;

  return (
    <div className="w-full h-full bg-transparent">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-black/5 shadow-sm pt-[env(safe-area-inset-top)]">
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
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`w-full p-4 bg-white rounded-2xl border flex items-center justify-between transition-all ${
                  theme === option.id ? 'border-black shadow-sm' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${theme === option.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">{option.label}</h3>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </div>
                {theme === option.id && <Check className="w-5 h-5 text-black" />}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
