"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Language, LocaleTranslations, locales } from '@/locales';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: LocaleTranslations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'id';
  try {
    const saved = localStorage.getItem('app_lang');
    if (saved === 'id' || saved === 'en') return saved;
  } catch {
    // ignore
  }
  return 'id'; // default to Indonesian
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = getSavedLanguage();
    setLanguageState(saved);
    document.documentElement.setAttribute('lang', saved);
    setMounted(true);
  }, []);

  const setLanguage = (nextLang: Language) => {
    setLanguageState(nextLang);
    document.documentElement.setAttribute('lang', nextLang);
    try {
      localStorage.setItem('app_lang', nextLang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'id' ? 'en' : 'id');
  };

  const t = useMemo(() => locales[language], [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
