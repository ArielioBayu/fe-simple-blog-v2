"use client";

import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  style,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      style={{
        padding: '3rem 1.75rem',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid var(--border)',
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
      className={`empty-state-card animate-fade-in ${className}`}
    >
      {/* Icon Badge */}
      <div
        style={{
          width: '68px',
          height: '68px',
          borderRadius: '20px',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.14) 0%, rgba(99, 102, 241, 0.08) 80%)',
          border: '1px solid rgba(236, 72, 153, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.25rem',
          color: 'var(--brand-pink, #EC4899)',
        }}
        aria-hidden="true"
      >
        {icon || (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        )}
      </div>

      {/* 1. What is empty */}
      <h3
        style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          fontFamily: 'var(--font-display, "Outfit", sans-serif)',
          letterSpacing: '-0.02em',
          color: 'var(--heading-color, #FFFFFF)',
          marginBottom: '0.45rem',
        }}
      >
        {title}
      </h3>

      {/* 2. Why it is empty */}
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--fg-muted, #94A3B8)',
          maxWidth: '440px',
          lineHeight: 1.55,
          marginBottom: action || secondaryAction ? '1.5rem' : '0',
        }}
      >
        {description}
      </p>

      {/* 3. What the user can do next */}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
          {secondaryAction && (
            <Button
              variant="secondary"
              size="md"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}

          {action && (
            <Button
              variant={action.variant || 'primary'}
              size="md"
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
