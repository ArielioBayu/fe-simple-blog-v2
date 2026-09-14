"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context';
import { ThemeToggle } from '@/components';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login({ email, password });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(msg);
      setSubmitting(false);
    }
  };

  const isBusy = submitting || isLoading;

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.topBar}>
        <ThemeToggle />
      </div>

      <div style={styles.card} className="glass">
        <div style={styles.header}>
          <div style={styles.badgeContainer}>
            <div style={styles.logoCircle}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </div>
          </div>
          <h1 style={styles.logo}>
            Simple<span style={styles.logoSpan}>Blog</span>
          </h1>
          <p style={styles.subtitle}>Sign in to share your stories with the community</p>
        </div>

        {error && (
          <div style={styles.error} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="login-email" style={styles.label}>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label htmlFor="login-password" style={styles.label}>
                Password
              </label>
            </div>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={isBusy}
          >
            {isBusy ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}></span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p style={styles.footerText}>
          Don&apos;t have an account?{' '}
          <Link href="/register" style={styles.link}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: '1.5rem',
    right: '1.5rem',
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.5rem 2rem',
    borderRadius: 'var(--radius-lg)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  badgeContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px var(--glow-color)',
  },
  logo: {
    fontSize: '2rem',
    fontWeight: 800,
    marginBottom: '0.4rem',
    letterSpacing: '-0.02em',
  },
  logoSpan: {
    background: 'var(--accent-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: 'var(--fg-muted)',
    fontSize: '0.92rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--fg-main)',
  },
  submitBtn: {
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.85rem',
    fontSize: '0.98rem',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#EF4444',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.88rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    lineHeight: '1.4',
  },
  footerText: {
    marginTop: '2rem',
    textAlign: 'center',
    color: 'var(--fg-muted)',
    fontSize: '0.9rem',
  },
  link: {
    color: 'var(--secondary)',
    fontWeight: 600,
  },
};
