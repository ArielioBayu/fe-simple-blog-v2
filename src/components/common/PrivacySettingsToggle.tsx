"use client";

import React, { useState } from 'react';
import { useTheme } from '@/context';
import { followService } from '@/services';

export interface PrivacySettingsToggleProps {
  initialIsPrivate: boolean;
  onPrivacyChanged?: (isPrivate: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const PrivacySettingsToggle: React.FC<PrivacySettingsToggleProps> = ({
  initialIsPrivate,
  onPrivacyChanged,
  className = '',
  style,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setIsPrivate(initialIsPrivate);
  }, [initialIsPrivate]);

  const handleToggle = () => {
    if (isLoading) return;
    if (isPrivate) {
      // Saat ingin beralih dari Private ke Public, tampilkan konfirmasi (pending requests akan auto-accepted)
      setShowWarningModal(true);
    } else {
      executeChange(true);
    }
  };

  const executeChange = async (targetValue: boolean) => {
    setShowWarningModal(false);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await followService.updatePrivacy(targetValue);
      setIsPrivate(targetValue);
      onPrivacyChanged?.(targetValue);
    } catch (err) {
      console.error('Failed to update account privacy:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memperbarui pengaturan privasi.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className={className}
        style={{
          padding: '1rem 1.15rem',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.025)',
          borderRadius: '16px',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(15, 23, 42, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          transition: 'all 0.2s ease',
          ...style,
        }}
      >
        {/* Left: Icon Badge & Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              minWidth: '40px',
              borderRadius: '12px',
              background: isPrivate
                ? 'linear-gradient(135deg, rgba(255, 90, 54, 0.16) 0%, rgba(225, 48, 108, 0.16) 100%)'
                : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'),
              border: isPrivate
                ? '1px solid rgba(255, 90, 54, 0.3)'
                : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.07)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isPrivate ? 'var(--brand-coral, #FF5A36)' : 'var(--fg-muted)',
              flexShrink: 0,
              transition: 'all 0.25s ease',
            }}
          >
            {isPrivate ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h4
                style={{
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: 'var(--heading-color)',
                  margin: 0,
                }}
              >
                Akun Privat
              </h4>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: isPrivate
                    ? (isDark ? 'rgba(255, 90, 54, 0.16)' : 'rgba(255, 90, 54, 0.12)')
                    : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)'),
                  color: isPrivate ? 'var(--brand-coral, #FF5A36)' : 'var(--fg-muted)',
                  border: isPrivate
                    ? '1px solid rgba(255, 90, 54, 0.28)'
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                {isPrivate ? 'Aktif' : 'Publik'}
              </span>
            </div>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--fg-muted)',
                margin: 0,
                lineHeight: 1.45,
                fontFamily: 'var(--font-sans)',
              }}
            >
              Jika aktif, hanya orang yang Anda setujui yang dapat melihat artikel dan cerita Anda.
            </p>
          </div>
        </div>

        {/* Right: Modern Pixel-Perfect Toggle Switch */}
        <button
          type="button"
          disabled={isLoading}
          onClick={handleToggle}
          aria-label={isPrivate ? 'Nonaktifkan akun privat' : 'Aktifkan akun privat'}
          role="switch"
          aria-checked={isPrivate}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: '48px',
            height: '26px',
            minWidth: '48px',
            minHeight: '26px',
            flexShrink: 0,
            borderRadius: '9999px',
            border: isPrivate
              ? '1px solid rgba(225, 48, 108, 0.3)'
              : (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)'),
            background: isPrivate
              ? 'linear-gradient(135deg, #FF5A36 0%, #E1306C 100%)'
              : (isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1'),
            boxShadow: isPrivate
              ? '0 2px 8px rgba(225, 48, 108, 0.35)'
              : 'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
            cursor: isLoading ? 'wait' : 'pointer',
            transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
            padding: 0,
            margin: 0,
            outline: 'none',
          }}
        >
          {/* Knob */}
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
              transform: isPrivate ? 'translateX(22px)' : 'translateX(0px)',
              transition: 'transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading && (
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  border: '2px solid rgba(225, 48, 108, 0.4)',
                  borderTopColor: 'var(--brand-coral, #FF5A36)',
                  animation: 'spin 0.6s linear infinite',
                }}
              />
            )}
          </span>
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          style={{
            marginTop: '0.5rem',
            padding: '0.55rem 0.85rem',
            borderRadius: 'var(--radius-sm, 8px)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#EF4444',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>⚠</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modal Peringatan Beralih ke Publik (Instagram Style) */}
      {showWarningModal && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWarningModal(false);
          }}
        >
          <div
            className="glass animate-slide-up"
            style={{
              width: '100%',
              maxWidth: '360px',
              borderRadius: '24px',
              padding: '1.75rem 1.5rem 1.25rem',
              textAlign: 'center',
              backgroundColor: isDark ? '#18181B' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: isDark
                ? '0 25px 60px -15px rgba(0,0,0,0.9)'
                : '0 25px 60px -15px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌐</div>
            <h3
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--heading-color)',
                fontFamily: 'var(--font-outfit), sans-serif',
                margin: '0 0 0.5rem',
              }}
            >
              Beralih ke Akun Publik?
            </h3>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--fg-muted)',
                margin: '0 0 1.5rem',
                lineHeight: 1.5,
              }}
            >
              Semua orang dapat melihat postingan Anda. Seluruh permintaan follow yang saat ini masih tertunda akan secara otomatis disetujui.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => executeChange(false)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                }}
              >
                Beralih ke Publik
              </button>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
