"use client";

import React from 'react';

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div style={styles.toast} className="animate-slide-up">
      <span style={{ fontSize: '1.1rem' }}>✨</span>
      <span>{message}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toast: {
    position: 'fixed',
    top: '85px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
    backgroundColor: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(225, 48, 108, 0.4)',
    boxShadow: 'var(--shadow-lg), 0 0 20px rgba(225, 48, 108, 0.25)',
    color: 'var(--fg-main)',
    padding: '0.75rem 1.4rem',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
};
