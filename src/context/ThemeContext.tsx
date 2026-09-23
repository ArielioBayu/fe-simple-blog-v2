"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Reads the saved theme from localStorage.
 * Falls back to 'light' if nothing is saved yet.
 * Never reads from prefers-color-scheme so the user's explicit choice is always honoured.
 */
function getSavedTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light'; // explicit default: always start in light mode
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise synchronously from localStorage so there is no flash
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const saved = getSavedTheme();
    // Apply to <html data-theme> and React state in one go
    document.documentElement.setAttribute('data-theme', saved);
    setThemeState(saved);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
