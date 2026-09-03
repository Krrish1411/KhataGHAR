import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePalette =
  | 'pine'
  | 'ember'
  | 'night'
  | 'ocean'
  | 'dusk'
  | 'sand'
  | 'berry'
  | 'graphite';

export type Theme = ThemePalette | 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'dark' | 'light';
  currentPalette: ThemePalette;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_PALETTES: ThemePalette[] = ['night', 'dusk', 'berry', 'graphite'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('khata_ghar_theme') as Theme;
    return saved || 'pine'; // Default to PaisaBook signature pine
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('light');
  const [currentPalette, setCurrentPalette] = useState<ThemePalette>('pine');

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let resolvedPalette: ThemePalette = 'pine';

      if (theme === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolvedPalette = isSystemDark ? 'night' : 'pine';
      } else if (theme === 'dark') {
        resolvedPalette = 'night';
      } else if (theme === 'light') {
        resolvedPalette = 'pine';
      } else {
        resolvedPalette = theme;
      }

      const isDark = DARK_PALETTES.includes(resolvedPalette);
      setEffectiveTheme(isDark ? 'dark' : 'light');
      setCurrentPalette(resolvedPalette);

      root.setAttribute('data-theme', resolvedPalette);

      if (isDark) {
        root.classList.add('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0a0f0c');
      } else {
        root.classList.remove('dark');
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#0e5138');
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('khata_ghar_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, currentPalette, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
