import React, { useState } from 'react';
import { ArrowLeft, Moon, Sun, Type, Globe, Eye, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';

export default function AccessibilitySettings() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 p-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-black" />
        </button>
        <div>
          <h2 className="text-xl font-black tracking-tight">{t('accessibility')} & Display</h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Customize your view</p>
        </div>
      </div>

      <div className="p-6 space-y-10">
        {/* Display Section */}
        <section>
          <h3 className="text-xs text-gray-300 font-black uppercase tracking-widest mb-6">Display</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-[32px]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                  {darkMode ? <Moon className="w-5 h-5 text-black" /> : <Sun className="w-5 h-5 text-black" />}
                </div>
                <div>
                  <p className="font-black text-black tracking-tight">Dark Mode</p>
                  <p className="text-xs text-gray-400 font-medium">Easier on the eyes in the dark.</p>
                </div>
              </div>
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${darkMode ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="p-6 bg-gray-50 rounded-[32px] space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-white rounded-2xl shadow-sm">
                  <Type className="w-5 h-5 text-black" />
                </div>
                <p className="font-black text-black tracking-tight">Font Size</p>
              </div>
              <input 
                type="range" 
                min="12" 
                max="24" 
                value={fontSize} 
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest">
                <span>Small</span>
                <span>Default ({fontSize}px)</span>
                <span>Large</span>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Section */}
        <section>
          <h3 className="text-xs text-gray-300 font-black uppercase tracking-widest mb-6">Accessibility</h3>
          <div className="space-y-4">
            {[
              { icon: Zap, label: 'Reduce Motion', desc: 'Minimize animations and transitions.' },
              { icon: Eye, label: 'High Contrast', desc: 'Make text and elements stand out more.' },
              { icon: Globe, label: t('language'), desc: 'English (United States)', hasArrow: true, to: '/settings/languages' }
            ].map((item) => (
              <button 
                key={item.label} 
                onClick={() => item.to && navigate(item.to)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-[24px] transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-white transition-colors shadow-sm">
                    <item.icon className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                  <div>
                    <p className="font-black text-black tracking-tight">{item.label}</p>
                    <p className="text-xs text-gray-400 font-medium">{item.desc}</p>
                  </div>
                </div>
                {item.hasArrow && <div className="w-2 h-2 border-t-2 border-r-2 border-gray-300 rotate-45" />}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
