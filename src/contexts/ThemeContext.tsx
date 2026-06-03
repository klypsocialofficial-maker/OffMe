import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'amoled' | 'system' | 'cyberpunk' | 'dark_gold';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t: Theme) => {
      const isDark = t === 'dark' || t === 'amoled' || t === 'cyberpunk' || t === 'dark_gold' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        document.documentElement.style.setProperty('color-scheme', 'dark');
        
        if (t === 'amoled') {
          document.documentElement.classList.add('amoled');
          document.body.classList.add('amoled');
        } else {
          document.documentElement.classList.remove('amoled');
          document.body.classList.remove('amoled');
        }

        if (t === 'cyberpunk') {
          document.documentElement.classList.add('cyberpunk');
          document.body.classList.add('cyberpunk');
        } else {
          document.documentElement.classList.remove('cyberpunk');
          document.body.classList.remove('cyberpunk');
        }

        if (t === 'dark_gold') {
          document.documentElement.classList.add('dark_gold');
          document.body.classList.add('dark_gold');
        } else {
          document.documentElement.classList.remove('dark_gold');
          document.body.classList.remove('dark_gold');
        }
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        document.documentElement.classList.remove('amoled');
        document.body.classList.remove('amoled');
        document.documentElement.classList.remove('cyberpunk');
        document.body.classList.remove('cyberpunk');
        document.documentElement.classList.remove('dark_gold');
        document.body.classList.remove('dark_gold');
        document.documentElement.style.setProperty('color-scheme', 'light');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
