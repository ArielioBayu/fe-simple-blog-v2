"use client";

import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ErrorState({
  title = 'Terjadi Kendala',
  message = 'Tidak dapat memuat data. Silakan periksa koneksi Anda dan coba lagi.',
  onRetry,
  retryLabel = 'Coba Lagi',
  className = '',
  style,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        padding: '2.5rem 1.75rem',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        boxSizing: 'border-box',
        width: '100%',
        margin: '1rem 0',
        ...style,
      }}
      className={`error-state-card animate-fade-in ${className}`}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '18px',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          color: '#EF4444',
        }}
        aria-hidden="true"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3
        style={{
          fontSize: '1.2rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display, "Outfit", sans-serif)',
          letterSpacing: '-0.02em',
          color: 'var(--heading-color, #FFFFFF)',
          marginBottom: '0.4rem',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--fg-muted, #94A3B8)',
          maxWidth: '420px',
          lineHeight: 1.5,
          marginBottom: onRetry ? '1.25rem' : '0',
        }}
      >
        {message}
      </p>

      {onRetry && (
        <Button
          variant="secondary"
          size="md"
          onClick={onRetry}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
          }
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
