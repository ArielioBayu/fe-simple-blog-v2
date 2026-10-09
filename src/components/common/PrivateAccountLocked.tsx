"use client";

import React from 'react';
import { useTheme } from '@/context';

export interface PrivateAccountLockedProps {
  className?: string;
  style?: React.CSSProperties;
}

export const PrivateAccountLocked: React.FC<PrivateAccountLockedProps> = ({
  className = '',
  style,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`flex flex-col items-center justify-center ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
        marginTop: '1.5rem',
        width: '100%',
        ...style,
      }}
    >
      {/* Ikon Gembok Instagram Style */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: isDark ? '2px solid rgba(255, 255, 255, 0.9)' : '2px solid rgba(15, 23, 42, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          style={{ color: 'var(--heading-color)' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <h3
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: 'var(--heading-color)',
          fontFamily: 'var(--font-outfit), sans-serif',
          margin: '0 0 0.35rem',
        }}
      >
        Akun Ini Bersifat Privat
      </h3>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--fg-muted)',
          maxWidth: '320px',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Ikuti akun ini untuk melihat foto, artikel cerita, dan aktivitas mereka.
      </p>
    </div>
  );
};
