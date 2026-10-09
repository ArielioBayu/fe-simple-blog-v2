"use client";

import React from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  message: string | null;
  type?: ToastType;
}

export function Toast({ message, type = 'info' }: ToastProps) {
  if (!message) return null;

  const typeConfig: Record<ToastType, { icon: string; border: string; glow: string; color: string }> = {
    success: {
      icon: '✓',
      border: 'rgba(16, 185, 129, 0.4)',
      glow: 'rgba(16, 185, 129, 0.2)',
      color: '#10B981',
    },
    error: {
      icon: '✕',
      border: 'rgba(239, 68, 68, 0.45)',
      glow: 'rgba(239, 68, 68, 0.25)',
      color: '#EF4444',
    },
    warning: {
      icon: '⚠',
      border: 'rgba(245, 158, 11, 0.45)',
      glow: 'rgba(245, 158, 11, 0.25)',
      color: '#F59E0B',
    },
    info: {
      icon: '✨',
      border: 'rgba(225, 48, 108, 0.35)',
      glow: 'rgba(225, 48, 108, 0.2)',
      color: 'var(--brand-pink, #EC4899)',
    },
  };

  const current = typeConfig[type] || typeConfig.info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '85px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${current.border}`,
        boxShadow: `var(--shadow-lg), 0 8px 24px ${current.glow}`,
        color: 'var(--fg-main)',
        padding: '0.75rem 1.4rem',
        borderRadius: 'var(--radius-full)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        fontSize: '0.88rem',
        fontWeight: 600,
        maxWidth: '90vw',
      }}
      className="animate-slide-up"
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.95rem',
          fontWeight: 700,
          color: current.color,
        }}
        aria-hidden="true"
      >
        {current.icon}
      </span>
      <span>{message}</span>
    </div>
  );
}
