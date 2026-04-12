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
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Tema</h2>
          <div className="p-4 bg-white/40 border border-gray-100 rounded-2xl">
            <p className="text-gray-600">O modo noturno está desativado no momento. O tema padrão é Light.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
