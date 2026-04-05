import React from 'react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function DisplaySettings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="w-full h-full bg-white/50 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Exibição</h1>
      </div>
      <div className="space-y-4">
        <div 
          onClick={toggleTheme}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
        >
          <div>
            <h3 className="font-bold">Modo Escuro</h3>
            <p className="text-sm text-gray-500">Alternar entre modo claro e escuro.</p>
          </div>
          {theme === 'dark' ? <Moon className="w-6 h-6 text-blue-500" /> : <Sun className="w-6 h-6 text-yellow-500" />}
        </div>
      </div>
    </div>
  );
}
