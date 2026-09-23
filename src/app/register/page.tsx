"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth, useTheme } from '@/context';
import { authService } from '@/services';
import { OtpVerificationModal } from '@/components/common';

// 3 Dynamic Transparent Story Showcase Graphics
const DYNAMIC_HERO_IMAGES = [
  {
    src: '/images/login-1.png',
    id: 1,
    title: 'Momen Tim & Kreator',
  },
  {
    src: '/images/login-2.png',
    id: 2,
    title: 'Kisah Sahabat & Pekerja',
  },
  {
    src: '/images/login-3.png',
    id: 3,
    title: 'Petualangan & Inspirasi',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // If already authenticated with a valid session, redirect to /
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Dynamic image index: randomizes on refresh
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * DYNAMIC_HERO_IMAGES.length);
    queueMicrotask(() => {
      setCurrentImageIndex(randomIndex);
    });
  }, []);

  const activeImage = DYNAMIC_HERO_IMAGES[currentImageIndex];

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % DYNAMIC_HERO_IMAGES.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authService.signUp({ username, email, password });
      setRegisteredEmail(email);
      setSuccess(true);
      setShowOtpModal(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pendaftaran gagal. Silakan coba username atau email lain.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div style={{
      ...styles.pageWrapper,
      background: isDark
        ? '#000000'
        : 'radial-gradient(ellipse 85% 60% at 8% 12%, rgba(236, 72, 153, 0.14) 0%, transparent 55%), radial-gradient(ellipse 70% 55% at 92% 18%, rgba(99, 102, 241, 0.12) 0%, transparent 50%), radial-gradient(ellipse 80% 65% at 50% 95%, rgba(255, 90, 54, 0.10) 0%, transparent 58%), radial-gradient(ellipse 60% 50% at 85% 85%, rgba(14, 165, 233, 0.10) 0%, transparent 52%), linear-gradient(150deg, #FFFFFF 0%, #FFF9F7 28%, #FAF8FF 65%, #F0F7FF 100%)',
      color: isDark ? '#F5F5F5' : '#111827',
    }}>
      {/* Subtle Ambient Decorative Glow Orbs (Light Mode Only) */}
      {!isDark && (
        <div style={styles.ambientGlowContainer} aria-hidden="true">
          <div style={styles.glowBlobTopLeft} />
          <div style={styles.glowBlobBottomLeft} />
          <div style={styles.glowBlobRight} />
        </div>
      )}

      {/* Unified Centered Stage */}
      <div className="login-stage-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top Header Bar: Logo aligned to left of container, Theme toggle aligned to right */}
        <header className="login-top-header">
          <div style={styles.brandLogoGroup}>
            <div className="auth-brand-badge" style={styles.customLogoBadge}>
              <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                <defs>
                  <linearGradient id="sbRegBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="45%" stopColor="#EC4899" />
                    <stop offset="100%" stopColor="#FF5A36" />
                  </linearGradient>
                  <linearGradient id="sbRegSparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD200" />
                    <stop offset="100%" stopColor="#F7971E" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="32" height="32" rx="11" fill="url(#sbRegBrandGrad)" />
                <path
                  d="M24 10.5C22.2 8.7 19.5 9 17.5 11L10.5 18C9.5 19 9 20.5 9 22L8 28L14 27C15.5 27 17 26.5 18 25.5L25 18.5C27 16.5 27.3 13.8 25.5 12L24 10.5Z"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(255, 255, 255, 0.12)"
                />
                <path
                  d="M14 22L19 17"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="26.5" cy="9.5" r="2.2" fill="url(#sbRegSparkGrad)" />
              </svg>
            </div>
            <span style={styles.brandNameText}>
              Simple<span style={styles.brandGradientWord}>Blog</span>
            </span>
          </div>

          {/* Theme Switcher Button */}
          <button
            id="reg-theme-toggle-btn"
            className="auth-theme-toggle"
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

        {/* Main Full-Width Split Layout */}
        <main className="login-split-main">
          {/* LEFT COLUMN: Hero Showcase */}
          <section className="login-hero-left">
            <div style={styles.headlineWrapper}>
              <h1 style={{
                ...styles.heroHeadline,
                color: isDark ? '#FFFFFF' : '#0F172A',
              }}>
                Mulai bagikan cerita dan<br />
                <span style={styles.vibrantGradientText}>terhubung bersama</span> dunia.
              </h1>
            </div>

            <div
              style={styles.heroGraphicWrapper}
              onClick={handleNextImage}
              title="Klik untuk beralih gambar momen berikutnya"
            >
              <Image
                key={activeImage.src}
                src={activeImage.src}
                alt="Bergabunglah dengan komunitas kreator"
                width={540}
                height={600}
                priority
                unoptimized
                style={{
                  ...styles.floatingHeroImage,
                  filter: isDark
                    ? 'drop-shadow(0 25px 50px rgba(0,0,0,0.85))'
                    : 'drop-shadow(0 20px 40px rgba(0,0,0,0.14))',
                }}
              />
            </div>
          </section>

          {/* RIGHT COLUMN: Registration Card */}
          <section
            className="login-form-right"
            style={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(226, 232, 240, 0.85)',
            }}
          >
            <div style={{
              ...styles.loginBox,
              backgroundColor: isDark ? '#121212' : 'rgba(255, 255, 255, 0.88)',
              backdropFilter: isDark ? 'none' : 'blur(20px)',
              WebkitBackdropFilter: isDark ? 'none' : 'blur(20px)',
              borderColor: isDark ? '#262626' : 'rgba(255, 255, 255, 0.95)',
              boxShadow: isDark
                ? '0 16px 40px rgba(0, 0, 0, 0.55)'
                : '0 24px 48px -12px rgba(99, 102, 241, 0.09), 0 8px 24px -4px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(226, 232, 240, 0.85)',
            }}>
              <h2 style={{
                ...styles.formHeading,
                color: isDark ? '#F5F5F5' : '#111827',
              }}>
                Daftar ke SimpleBlog
              </h2>
              <p style={{
                ...styles.formSubheading,
                color: isDark ? '#94A3B8' : '#64748B',
              }}>
                Daftar untuk melihat foto dan cerita dari teman-teman Anda.
              </p>

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

              {success && (
                <div style={styles.successMessage} role="status">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>Pendaftaran berhasil! Mengarahkan ke halaman login...</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={styles.formElement}>
                {/* Input Username */}
                <div style={styles.inputGroup}>
                  <input
                    id="reg-username"
                    type="text"
                    placeholder="Nama Pengguna (Username)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input-field"
                    style={{
                      ...styles.textInput,
                      backgroundColor: isDark ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
                      borderColor: isDark ? '#363636' : '#E2E8F0',
                      color: isDark ? '#FFFFFF' : '#000000',
                    }}
                    required
                    autoComplete="username"
                    minLength={3}
                  />
                </div>

                {/* Input Email */}
                <div style={styles.inputGroup}>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="Alamat Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input-field"
                    style={{
                      ...styles.textInput,
                      backgroundColor: isDark ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
                      borderColor: isDark ? '#363636' : '#E2E8F0',
                      color: isDark ? '#FFFFFF' : '#000000',
                    }}
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Input Password */}
                <div style={styles.inputGroup}>
                  <div style={styles.passwordContainer}>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Kata Sandi (Min. 6 karakter)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="auth-input-field"
                      style={{
                        ...styles.textInput,
                        paddingRight: '5rem',
                        backgroundColor: isDark ? '#1C1C1E' : 'rgba(255, 255, 255, 0.95)',
                        borderColor: isDark ? '#363636' : '#E2E8F0',
                        color: isDark ? '#FFFFFF' : '#000000',
                      }}
                      required
                      autoComplete="new-password"
                      minLength={6}
                    />
                    {password.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="auth-showhide-toggle"
                        style={styles.showHideToggle}
                      >
                        {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  className="auth-primary-btn"
                  style={{
                    ...styles.registerSubmitBtn,
                    opacity: loading || !username || !email || !password ? 0.7 : 1,
                    cursor: loading || !username || !email || !password ? 'not-allowed' : 'pointer',
                  }}
                  disabled={loading || success || !username || !email || !password}
                >
                  {loading ? (
                    <span style={styles.btnLoadingRow}>
                      <span style={styles.spinnerIcon}></span>
                      Mendaftarkan...
                    </span>
                  ) : (
                    'Daftar'
                  )}
                </button>
              </form>

              {/* Policy Note */}
              <p style={{
                ...styles.termsNote,
                color: isDark ? '#737373' : '#64748B',
              }}>
                Dengan mendaftar, Anda menyetujui Ketentuan, Kebijakan Privasi, dan Kebijakan Cookie SimpleBlog.
              </p>

              {/* Divider ATAU */}
              <div style={styles.orDividerRow}>
                <div style={{ ...styles.dividerBar, backgroundColor: isDark ? '#262626' : '#E2E8F0' }}></div>
                <span style={{ ...styles.orText, color: isDark ? '#737373' : '#8E8E8E' }}>SUDAH PUNYA AKUN?</span>
                <div style={{ ...styles.dividerBar, backgroundColor: isDark ? '#262626' : '#E2E8F0' }}></div>
              </div>

              {/* Link to Login */}
              <div style={styles.loginLinkWrapper}>
                <Link href="/login" className="auth-secondary-btn" style={styles.loginLinkButton}>
                  Masuk ke Akun Anda
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
      </div>

      {/* FOOTER */}
      <footer style={{
        ...styles.footerContainer,
        position: 'relative',
        zIndex: 1,
        borderColor: isDark ? '#262626' : 'rgba(226, 232, 240, 0.8)',
        backgroundColor: isDark ? 'transparent' : 'rgba(255, 255, 255, 0.45)',
        backdropFilter: isDark ? 'none' : 'blur(10px)',
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

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        visible={showOtpModal}
        email={registeredEmail || email}
        onClose={() => setShowOtpModal(false)}
        onSuccess={() => {
          router.push('/login?verified=true');
        }}
      />
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
    justifyContent: 'space-between',
  },

  /* Ambient Lighting Blobs (Light Mode) */
  ambientGlowContainer: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: 0,
  },
  glowBlobTopLeft: {
    position: 'absolute',
    top: '-6%',
    left: '-6%',
    width: '540px',
    height: '540px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.20) 0%, rgba(255, 90, 54, 0.10) 45%, transparent 70%)',
    filter: 'blur(75px)',
  },
  glowBlobBottomLeft: {
    position: 'absolute',
    bottom: '-6%',
    left: '16%',
    width: '480px',
    height: '480px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(251, 146, 60, 0.16) 0%, rgba(244, 114, 182, 0.08) 50%, transparent 70%)',
    filter: 'blur(80px)',
  },
  glowBlobRight: {
    position: 'absolute',
    top: '8%',
    right: '-6%',
    width: '520px',
    height: '520px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.14) 0%, rgba(14, 165, 233, 0.10) 50%, transparent 70%)',
    filter: 'blur(80px)',
  },

  /* Brand Logo & Identity */
  brandLogoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  customLogoBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    filter: 'drop-shadow(0 6px 16px rgba(236, 72, 153, 0.35))',
    cursor: 'pointer',
  },
  brandNameText: {
    fontSize: '1.5rem',
    fontWeight: 800,
    fontFamily: '"Outfit", sans-serif',
    letterSpacing: '-0.03em',
    userSelect: 'none',
  },
  brandGradientWord: {
    background: 'linear-gradient(135deg, #EC4899 0%, #FF5A36 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline',
  },

  /* Theme Switcher Button */
  themeToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.5rem 1.05rem',
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

  /* Left Hero Content Elements */
  headlineWrapper: {
    textAlign: 'center',
    marginBottom: '1.25rem',
    width: '100%',
    maxWidth: '540px',
  },
  heroHeadline: {
    fontSize: 'clamp(1.85rem, 2.6vw, 2.5rem)',
    fontWeight: 800,
    lineHeight: 1.18,
    letterSpacing: '-0.03em',
    margin: 0,
  },
  vibrantGradientText: {
    background: 'linear-gradient(90deg, #FD1D1D 0%, #E1306C 60%, #833AB4 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline',
  },
  heroGraphicWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '460px',
    cursor: 'pointer',
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  floatingHeroImage: {
    width: '100%',
    height: 'auto',
    maxWidth: '440px',
    maxHeight: '430px',
    objectFit: 'contain',
    display: 'block',
    userSelect: 'none',
  },

  /* Right Form Box */
  loginBox: {
    borderRadius: '16px',
    padding: '2.25rem 2.25rem 1.75rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '390px',
  },
  formHeading: {
    fontSize: '1.2rem',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '0.4rem',
    letterSpacing: '-0.02em',
  },
  formSubheading: {
    fontSize: '0.82rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
    lineHeight: 1.4,
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
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    color: '#10B981',
    fontSize: '0.82rem',
    marginBottom: '1.25rem',
  },
  formElement: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
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
  registerSubmitBtn: {
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.78rem',
    borderRadius: '9999px',
    backgroundColor: '#0095F6',
    color: '#FFFFFF',
    border: 'none',
    fontSize: '0.92rem',
    fontWeight: 700,
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
    boxShadow: '0 4px 14px rgba(0, 149, 246, 0.3)',
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
  termsNote: {
    fontSize: '0.72rem',
    textAlign: 'center',
    margin: '1.1rem 0 0.5rem',
    lineHeight: 1.4,
  },
  orDividerRow: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.25rem 0',
    gap: '0.75rem',
  },
  dividerBar: {
    flex: 1,
    height: '1px',
  },
  orText: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  loginLinkWrapper: {
    marginTop: '0.25rem',
  },
  loginLinkButton: {
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
    marginTop: '2rem',
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

