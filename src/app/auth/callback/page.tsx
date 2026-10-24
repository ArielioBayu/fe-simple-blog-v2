"use client";

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context';
import { AmbientAuroraBackground } from '@/components/common';

function CallbackHandler() {
  const searchParams = useSearchParams();
  const { loginWithTokens, user } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasTriggeredAuth = useRef(false);

  useEffect(() => {
    async function handleAuth() {
      // Prevent duplicate execution from StrictMode
      if (hasTriggeredAuth.current) return;
      hasTriggeredAuth.current = true;

      const errorParam = searchParams.get('error');
      const tokenParam = searchParams.get('token');
      const refreshTokenParam = searchParams.get('refresh_token');

      // 1. Backend or OAuth provider reported an error
      if (errorParam) {
        setStatus('error');
        if (errorParam === 'access_denied') {
          setErrorMessage('Izin autentikasi Google dibatalkan oleh pengguna.');
        } else if (errorParam === 'oauth_failed') {
          setErrorMessage('Gagal memverifikasi akun Google dengan server. Silakan coba kembali.');
        } else {
          setErrorMessage(`Autentikasi gagal: ${errorParam.replace(/_/g, ' ')}`);
        }
        return;
      }

      // 2. Token is missing
      if (!tokenParam) {
        setStatus('error');
        setErrorMessage('Tautan masuk tidak memiliki token autentikasi yang valid.');
        return;
      }

      // 3. Process tokens and initiate authenticated session
      try {
        await loginWithTokens(tokenParam, refreshTokenParam || undefined);
        setStatus('success');

        // Deterministic redirect using window.location.replace to flush stale client router cache
        setTimeout(() => {
          window.location.replace('/');
        }, 850);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Terjadi kendala saat menyinkronkan profil Anda. Silakan coba masuk kembali.'
        );
      }
    }

    handleAuth();
  }, [searchParams, loginWithTokens]);

  const handleManualNavigate = () => {
    window.location.replace('/');
  };

  return (
    <div className="callback-card">
      {/* Brand Squircle Emblem */}
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #FF5A36 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          boxShadow: '0 10px 28px rgba(236, 72, 153, 0.42)',
          position: 'relative',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
          <path
            d="M24 10.5C22.2 8.7 19.5 9 17.5 11L10.5 18C9.5 19 9 20.5 9 22L8 28L14 27C15.5 27 17 26.5 18 25.5L25 18.5C27 16.5 27.3 13.8 25.5 12L24 10.5Z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(255, 255, 255, 0.18)"
          />
          <path d="M14 22L19 17" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="26.5" cy="9.5" r="2.2" fill="#FFD200" />
        </svg>
      </div>

      {/* STATE 1: LOADING */}
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div
            style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              marginBottom: '1.25rem',
            }}
          >
            <div className="callback-spinner-ring" />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--fg-main, #0F172A)',
              marginBottom: '0.45rem',
              letterSpacing: '-0.025em',
            }}
          >
            Menghubungkan Akun Google...
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '0.88rem',
              color: 'var(--fg-muted, #64748B)',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '320px',
            }}
          >
            Mohon tunggu sebentar, kami sedang memverifikasi identitas Anda dengan SimpleBlog.
          </p>
        </div>
      )}

      {/* STATE 2: SUCCESS */}
      {status === 'success' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div className="callback-check-circle">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--fg-main, #0F172A)',
              marginBottom: '0.4rem',
              letterSpacing: '-0.025em',
            }}
          >
            Berhasil Masuk!
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '0.9rem',
              color: 'var(--fg-muted, #64748B)',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.5,
            }}
          >
            Selamat datang,{' '}
            <strong
              style={{
                color: 'var(--fg-main, #0F172A)',
                fontWeight: 700,
              }}
            >
              {user?.username || 'Kreator'}
            </strong>
            ! Mengalihkan ke beranda...
          </p>

          {/* Animated Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '5px',
              backgroundColor: 'rgba(0, 0, 0, 0.06)',
              borderRadius: '999px',
              overflow: 'hidden',
              marginTop: '0.85rem',
            }}
          >
            <div className="callback-progress-fill" />
          </div>

          {/* Action button if auto-redirect is delayed */}
          <button
            type="button"
            onClick={handleManualNavigate}
            className="auth-primary-btn"
            style={{
              marginTop: '1.4rem',
              width: '100%',
              padding: '0.8rem 1.4rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 50%, #FF5A36 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 20px rgba(236, 72, 153, 0.35)',
            }}
          >
            <span>Buka Beranda Sekarang</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      )}

      {/* STATE 3: ERROR */}
      {status === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              backgroundColor: '#FEF2F2',
              border: '2px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              boxShadow: '0 8px 24px -4px rgba(239, 68, 68, 0.3)',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h2
            style={{
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--fg-main, #0F172A)',
              marginBottom: '0.45rem',
              letterSpacing: '-0.025em',
            }}
          >
            Autentikasi Gagal
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: '0.88rem',
              color: '#DC2626',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {errorMessage || 'Tidak dapat menyelesaikan proses masuk dengan Google.'}
          </p>

          <Link
            href="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '0.8rem 1.4rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #EC4899 0%, #FF5A36 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(236, 72, 153, 0.35)',
              boxSizing: 'border-box',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Kembali ke Halaman Login</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="callback-page-container">
      <AmbientAuroraBackground />
      <div className="callback-backdrop-dimmer" aria-hidden="true" />

      <Suspense
        fallback={
          <div
            className="callback-card"
            style={{
              minHeight: '240px',
              justifyContent: 'center',
            }}
          >
            <div className="callback-spinner-ring" style={{ width: '52px', height: '52px', marginBottom: '1.25rem' }} />
            <p style={{ color: 'var(--fg-muted, #64748B)', fontSize: '0.9rem', margin: 0, fontWeight: 500 }}>
              Memuat sesi autentikasi...
            </p>
          </div>
        }
      >
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
