"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';
import { ThemeToggle } from '@/components';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authService.signUp({ username, email, password });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Try a different username or email.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
          </div>
          <h1 style={styles.logo}>
            Simple<span style={styles.logoSpan}>Blog</span>
          </h1>
          <p style={styles.subtitle}>Create your new account and join the conversations</p>
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

        {success && (
          <div style={styles.success} role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Account created successfully! Redirecting to login...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="reg-username" style={styles.label}>
              Username
            </label>
            <input
              id="reg-username"
              type="text"
              placeholder="e.g. johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              minLength={3}
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="reg-email" style={styles.label}>
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="reg-password" style={styles.label}>
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading || success}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="animate-spin" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}></span>
                Creating account...
              </span>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <p style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Sign In
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
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10B981',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.88rem',
    marginBottom: '1.5rem',
    border: '1px solid rgba(16, 185, 129, 0.25)',
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
