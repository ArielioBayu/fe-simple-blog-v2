"use client";

import React from 'react';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  helperText,
  children,
  className = '',
  style,
}: FormFieldProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginBottom: '1rem',
        ...style,
      }}
      className={`form-field-group ${className}`}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--fg-main, #0F172A)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{label}</span>
          {required && (
            <span
              style={{ color: '#EF4444', fontWeight: 700 }}
              title="Wajib diisi"
              aria-label="wajib"
            >
              *
            </span>
          )}
        </label>
      )}

      {children}

      {error ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.8rem',
            color: '#EF4444',
            marginTop: '2px',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--fg-muted, #64748B)',
            margin: '2px 0 0',
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
