"use client";

import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      loadingText,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      disabled,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
      sm: {
        height: '32px',
        padding: '0 0.75rem',
        fontSize: '0.8125rem',
        borderRadius: 'var(--radius-sm, 8px)',
        gap: '6px',
      },
      md: {
        height: '40px',
        padding: '0 1.125rem',
        fontSize: '0.875rem',
        borderRadius: 'var(--radius-sm, 8px)',
        gap: '8px',
      },
      lg: {
        height: '48px',
        padding: '0 1.5rem',
        fontSize: '0.9375rem',
        borderRadius: 'var(--radius-md, 12px)',
        gap: '10px',
      },
    };

    const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
      primary: {
        background: 'var(--accent-gradient, linear-gradient(135deg, #FF5A36 0%, #E1306C 45%, #833AB4 100%))',
        color: '#FFFFFF',
        border: 'none',
        boxShadow: '0 4px 14px rgba(225, 48, 108, 0.25)',
      },
      secondary: {
        background: 'var(--btn-secondary-bg, rgba(255, 255, 255, 0.08))',
        color: 'var(--fg-main, #0F172A)',
        border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
        boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))',
      },
      outline: {
        background: 'transparent',
        color: 'var(--fg-main, #0F172A)',
        border: '1px solid var(--border-hover, rgba(255, 255, 255, 0.25))',
      },
      ghost: {
        background: 'transparent',
        color: 'var(--fg-muted, #64748B)',
        border: 'none',
      },
      destructive: {
        background: 'rgba(239, 68, 68, 0.12)',
        color: '#EF4444',
        border: '1px solid rgba(239, 68, 68, 0.3)',
      },
    };

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 600,
      fontFamily: 'var(--font-sans, sans-serif)',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.65 : 1,
      transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
      outline: 'none',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      width: fullWidth ? '100%' : 'auto',
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        style={baseStyle}
        className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`}
        {...props}
      >
        {isLoading && (
          <span
            className="spinner"
            style={{
              width: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
              height: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              marginRight: children || loadingText ? '6px' : '0',
            }}
            aria-hidden="true"
          />
        )}
        {!isLoading && icon && iconPosition === 'left' && <span className="btn-icon-left">{icon}</span>}
        <span>{isLoading && loadingText ? loadingText : children}</span>
        {!isLoading && icon && iconPosition === 'right' && <span className="btn-icon-right">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
