import React from 'react';
import { ArrowLeft, Moon, Sun, Monitor, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function DisplaySettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    { id: 'light', label: 'Light', icon: Sun, description: 'Always use light mode' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Always use dark mode' },
    { id: 'system', label: 'System', icon: Monitor, description: 'Match your device settings' },
  ] as const;

  return (
    <div className="w-full h-full bg-transparent p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 dark:border-white/10 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6 dark:text-white" />
        </button>
        <h1 className="text-xl font-bold dark:text-white">Display</h1>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">Theme</h2>
          <div className="space-y-2">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`w-full p-4 rounded-2xl transition-all flex items-center justify-between group ${
                  theme === option.id 
                    ? 'liquid-glass-card border-black/50 dark:border-white/50 bg-black/5 dark:bg-white/5' 
                    : 'bg-white/40 dark:bg-white/5 border border-transparent hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2.5 rounded-xl transition-colors ${
                    theme === option.id ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white'
                  }`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className={`font-bold transition-colors ${theme === option.id ? 'text-black dark:text-white' : 'text-gray-900 dark:text-white'}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
                  </div>
                </div>
                {theme === option.id && (
                  <div className="w-6 h-6 bg-black dark:bg-white rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white dark:text-black" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
