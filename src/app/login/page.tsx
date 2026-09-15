"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, useTheme } from '@/context';

// 3 Dynamic Showcase Images provided in docs folder
const DYNAMIC_HERO_IMAGES = [
  {
    src: '/images/login-1.jpg',
    id: 1,
    title: 'Momen Tim & Kreator',
  },
  {
    src: '/images/login-2.jpg',
    id: 2,
    title: 'Kisah Sahabat & Pekerja',
  },
  {
    src: '/images/login-3.jpg',
    id: 3,
    title: 'Petualangan & Inspirasi',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [googleNotice, setGoogleNotice] = useState(false);

  // Dynamic image index: changes on refresh
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    // Pick a random image on every page mount / refresh
    const randomIndex = Math.floor(Math.random() * DYNAMIC_HERO_IMAGES.length);
    queueMicrotask(() => {
      setCurrentImageIndex(randomIndex);
    });
  }, []);

  const activeImage = DYNAMIC_HERO_IMAGES[currentImageIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login({ email, password });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login gagal. Periksa kembali nomor ponsel, nama pengguna, atau kata sandi Anda.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setGoogleNotice(true);
    setTimeout(() => {
      setGoogleNotice(false);
    }, 4500);
  };

  const isDark = theme === 'dark';

  return (
    <div style={{
      ...styles.pageWrapper,
      backgroundColor: isDark ? '#000000' : '#FAFAFA',
      color: isDark ? '#F5F5F5' : '#111827',
    }}>
      {/* Toast Notification for Google OAuth */}
      {googleNotice && (
        <div style={styles.toast}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Fitur <strong>Login dengan Google (OAuth 2.0)</strong> sedang disiapkan di backend. Silakan gunakan email & password Anda.</span>
        </div>
      )}

      {/* Top Header Theme Toggle Button */}
      <header style={styles.topHeader}>
        <button
          onClick={toggleTheme}
          style={{
            ...styles.themeToggleBtn,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
            color: isDark ? '#FFFFFF' : '#1F2937',
          }}
          title={isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <span style={styles.themeToggleText}>Mode Terang</span>
            </>
          ) : (
            <>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <span style={styles.themeToggleText}>Mode Gelap</span>
            </>
          )}
        </button>
      </header>

      {/* Main Split Layout: Left Showcase & Right Login Box */}
      <main style={styles.mainContainer}>
        {/* LEFT COLUMN: Instagram-Style Headline & Dynamic 3D Story Image Showcase */}
        <section style={styles.leftColumn}>
          {/* Logo & Headline */}
          <div style={styles.headlineContainer}>
            <div style={styles.logoRow}>
              <div style={styles.instagramGlyph}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </div>
              <span style={styles.logoTitle}>SimpleBlog</span>
            </div>

            <h1 style={{
              ...styles.headlineText,
              color: isDark ? '#FFFFFF' : '#0F172A',
            }}>
              Lihat momen sehari-hari dari{' '}
              <span style={styles.gradientHighlight}>teman dekat</span> Anda.
            </h1>
          </div>

          {/* Dynamic 3D Showcase Graphic */}
          <div style={styles.showcaseGraphicWrapper}>
            <div style={styles.showcaseImageContainer} className="animate-scale-up">
              <Image
                key={activeImage.src}
                src={activeImage.src}
                alt="Story highlight preview"
                width={420}
                height={520}
                priority
                style={styles.showcaseImage}
              />
            </div>

            {/* Subtle Carousel Dots to cycle images dynamically */}
            <div style={styles.dotsRow}>
              {DYNAMIC_HERO_IMAGES.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setCurrentImageIndex(idx)}
                  style={{
                    ...styles.dotBtn,
                    backgroundColor: idx === currentImageIndex ? '#0095F6' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'),
                    width: idx === currentImageIndex ? '20px' : '7px',
                  }}
                  title={`Tampilkan gambar ${idx + 1}`}
                  aria-label={`Showcase image ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Instagram-Style Login Form */}
        <section style={styles.rightColumn}>
          <div style={{
            ...styles.loginBox,
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
            borderColor: isDark ? '#262626' : '#DBDBDB',
            boxShadow: isDark ? '0 12px 36px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.05)',
          }}>
            <h2 style={{
              ...styles.formHeading,
              color: isDark ? '#F5F5F5' : '#111827',
            }}>
              Login ke SimpleBlog
            </h2>

            {error && (
              <div style={styles.errorMessage} role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.formElement}>
              {/* Input Identifier */}
              <div style={styles.inputGroup}>
                <input
                  id="login-identifier"
                  type="text"
                  placeholder="Nomor ponsel, nama pengguna, atau email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    ...styles.textInput,
                    backgroundColor: isDark ? '#1C1C1E' : '#FAFAFA',
                    borderColor: isDark ? '#363636' : '#DBDBDB',
                    color: isDark ? '#FFFFFF' : '#000000',
                  }}
                  required
                  autoComplete="username email"
                />
              </div>

              {/* Input Password */}
              <div style={styles.inputGroup}>
                <div style={styles.passwordContainer}>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      ...styles.textInput,
                      paddingRight: '5rem',
                      backgroundColor: isDark ? '#1C1C1E' : '#FAFAFA',
                      borderColor: isDark ? '#363636' : '#DBDBDB',
                      color: isDark ? '#FFFFFF' : '#000000',
                    }}
                    required
                    autoComplete="current-password"
                  />
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.showHideToggle}
                    >
                      {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                  )}
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                style={{
                  ...styles.loginSubmitBtn,
                  opacity: submitting || !email || !password ? 0.7 : 1,
                  cursor: submitting || !email || !password ? 'not-allowed' : 'pointer',
                }}
                disabled={submitting || !email || !password}
              >
                {submitting ? (
                  <span style={styles.btnLoadingRow}>
                    <span style={styles.spinnerIcon}></span>
                    Masuk...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Forgot Password */}
            <div style={styles.forgotPasswordContainer}>
              <Link
                href="/login"
                style={{
                  ...styles.forgotPasswordText,
                  color: isDark ? '#A8A8A8' : '#6B7280',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  alert('Silakan hubungi administrator atau lakukan registrasi akun baru.');
                }}
              >
                Lupa kata sandi?
              </Link>
            </div>

            {/* Divider ATAU */}
            <div style={styles.orDividerRow}>
              <div style={{ ...styles.dividerBar, backgroundColor: isDark ? '#262626' : '#DBDBDB' }}></div>
              <span style={{ ...styles.orText, color: isDark ? '#737373' : '#8E8E8E' }}>ATAU</span>
              <div style={{ ...styles.dividerBar, backgroundColor: isDark ? '#262626' : '#DBDBDB' }}></div>
            </div>

            {/* Login with Google Button (Replaces Facebook as requested) */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              style={{
                ...styles.googleAuthBtn,
                backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                borderColor: isDark ? '#334155' : '#E5E7EB',
                color: isDark ? '#F1F5F9' : '#1F2937',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '10px', flexShrink: 0 }}>
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
              <span>Login dengan Google</span>
            </button>

            {/* Create New Account Button */}
            <div style={styles.createAccountWrapper}>
              <Link href="/register" style={styles.createAccountButton}>
                Buat akun baru
              </Link>
            </div>

            {/* Meta Branding */}
            <div style={{ ...styles.brandMetaRow, color: isDark ? '#737373' : '#8E8E8E' }}>
              <span style={styles.metaInfinitySymbol}>∞</span>
              <span>SimpleBlog from Bayu Aji</span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER: Instagram Style Navigation Links */}
      <footer style={{
        ...styles.footerContainer,
        borderColor: isDark ? '#262626' : '#E5E7EB',
      }}>
        <div style={styles.footerLinksGrid}>
          <a href="#" style={styles.footerLinkItem}>Tentang</a>
          <a href="#" style={styles.footerLinkItem}>Blog</a>
          <a href="#" style={styles.footerLinkItem}>Pekerjaan</a>
          <a href="#" style={styles.footerLinkItem}>Bantuan</a>
          <a href="#" style={styles.footerLinkItem}>API</a>
          <a href="#" style={styles.footerLinkItem}>Privasi</a>
          <a href="#" style={styles.footerLinkItem}>Ketentuan</a>
          <a href="#" style={styles.footerLinkItem}>Lokasi</a>
          <a href="#" style={styles.footerLinkItem}>Populer</a>
        </div>

        <div style={styles.footerBottomRow}>
          <span style={styles.languageDropdown}>Bahasa Indonesia ▾</span>
          <span style={styles.copyrightLabel}>© 2026 SimpleBlog from Bayu Aji</span>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    transition: 'background-color 0.25s ease, color 0.25s ease',
    position: 'relative',
    overflowX: 'hidden',
  },
  toast: {
    position: 'fixed',
    top: '1.25rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    padding: '0.85rem 1.3rem',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.875rem',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    maxWidth: '92vw',
  },
  topHeader: {
    position: 'absolute',
    top: '1.25rem',
    right: '1.5rem',
    zIndex: 40,
  },
  themeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.45rem 0.95rem',
    borderRadius: '9999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  themeToggleText: {
    letterSpacing: '-0.01em',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4.5rem',
    padding: '4rem 2rem 2rem',
    maxWidth: '1150px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
  },

  /* Left Showcase Styles */
  leftColumn: {
    flex: '1 1 500px',
    maxWidth: '560px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  headlineContainer: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  logoRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '1rem',
  },
  instagramGlyph: {
    width: '44px',
    height: '44px',
    borderRadius: '13px',
    background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(225, 48, 108, 0.35)',
  },
  logoTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  headlineText: {
    fontSize: '2.5rem',
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '-0.035em',
    maxWidth: '460px',
    margin: '0 auto',
  },
  gradientHighlight: {
    background: 'linear-gradient(90deg, #FD1D1D 0%, #E1306C 60%, #833AB4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline',
  },
  showcaseGraphicWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  showcaseImageContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '380px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
    transition: 'transform 0.3s ease',
  },
  showcaseImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '475px',
    objectFit: 'cover',
    borderRadius: '24px',
    display: 'block',
  },
  dotsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '1.25rem',
  },
  dotBtn: {
    height: '7px',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.25s ease',
  },

  /* Right Login Form Styles */
  rightColumn: {
    flex: '1 1 360px',
    maxWidth: '400px',
    width: '100%',
  },
  loginBox: {
    borderRadius: '16px',
    padding: '2.5rem 2.25rem 2rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
  },
  formHeading: {
    fontSize: '1.15rem',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '1.75rem',
    letterSpacing: '-0.02em',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    color: '#EF4444',
    fontSize: '0.82rem',
    marginBottom: '1.25rem',
  },
  formElement: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  inputGroup: {
    position: 'relative',
    width: '100%',
  },
  textInput: {
    width: '100%',
    padding: '0.85rem 0.95rem',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '0.84rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  showHideToggle: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#737373',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px',
  },
  loginSubmitBtn: {
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.75rem',
    borderRadius: '9999px',
    backgroundColor: '#0095F6',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '0.9rem',
    fontWeight: 700,
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
  },
  btnLoadingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinnerIcon: {
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  forgotPasswordContainer: {
    textAlign: 'center',
    marginTop: '1.25rem',
  },
  forgotPasswordText: {
    fontSize: '0.82rem',
    textDecoration: 'none',
    fontWeight: 500,
  },
  orDividerRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
    gap: '1rem',
  },
  dividerBar: {
    flex: 1,
    height: '1px',
  },
  orText: {
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  googleAuthBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.75rem',
    borderRadius: '9999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    marginBottom: '1rem',
  },
  createAccountWrapper: {
    marginTop: '0.25rem',
  },
  createAccountButton: {
    display: 'block',
    width: '100%',
    padding: '0.75rem',
    borderRadius: '9999px',
    border: '1px solid #0095F6',
    color: '#0095F6',
    textAlign: 'center',
    fontSize: '0.88rem',
    fontWeight: 700,
    textDecoration: 'none',
    boxSizing: 'border-box',
    transition: 'background-color 0.2s ease',
  },
  brandMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '2.5rem',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  metaInfinitySymbol: {
    fontSize: '1.1rem',
    lineHeight: 1,
  },

  /* Footer Links Styles */
  footerContainer: {
    padding: '2.2rem 1.5rem 1.8rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.1rem',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    marginTop: 'auto',
  },
  footerLinksGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '0.65rem 1.25rem',
    maxWidth: '920px',
  },
  footerLinkItem: {
    fontSize: '0.72rem',
    color: '#737373',
    textDecoration: 'none',
    fontWeight: 400,
  },
  footerBottomRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.72rem',
    color: '#737373',
    marginTop: '0.25rem',
  },
  languageDropdown: {
    cursor: 'pointer',
  },
  copyrightLabel: {
    fontWeight: 400,
  },
};
