"use client";

import React from 'react';
import { useLanguage, useTheme } from '@/context';

interface LanguageToggleProps {
  className?: string;
  style?: React.CSSProperties;
  showLabel?: boolean;
}

export function LanguageToggle({ className = '', style, showLabel = true }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`language-toggle-btn ${className}`}
      title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      aria-label={language === 'id' ? 'Switch language to English' : 'Ganti bahasa ke Indonesia'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.4rem 0.75rem',
        borderRadius: '9999px',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)',
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
        color: 'var(--fg-main)',
        fontSize: '0.82rem',
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
        ...style,
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.85 }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span style={{ letterSpacing: '0.04em' }}>{language.toUpperCase()}</span>
      {showLabel && (
        <span style={{ fontSize: '0.74rem', opacity: 0.65, fontWeight: 500 }}>
          ({language === 'id' ? 'ID' : 'EN'})
        </span>
      )}
    </button>
  );
}
