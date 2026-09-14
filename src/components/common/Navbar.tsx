"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onCreatePost?: () => void;
  onThemeToggled?: (theme: string) => void;
  onHomeClick?: () => void;
  showBackToFeed?: boolean;
}

export function Navbar({
  onCreatePost,
  onThemeToggled,
  onHomeClick,
  showBackToFeed = false,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const username = user?.username || '';

  return (
    <nav style={styles.nav} className="glass">
      <div style={styles.navContent} className="container">
        {/* Brand Logo */}
        <Link href="/" style={styles.brandLogo} onClick={onHomeClick}>
          <span style={styles.logoSimple}>Simple</span>
          <span style={styles.logoBlog}>Blog</span>
        </Link>

        {/* Navigation Actions */}
        <div style={styles.navActions}>
          {showBackToFeed ? (
            <Link href="/" className="btn btn-secondary" style={{ padding: '0.5rem 1.15rem', fontSize: '0.88rem' }}>
              &larr; Back to Feed
            </Link>
          ) : (
            onCreatePost && (
              <button
                className="btn btn-primary"
                style={styles.newPostBtn}
                onClick={onCreatePost}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>Create Post</span>
              </button>
            )
          )}

          {/* User Profile Badge */}
          {username && (
            <div style={styles.userSection}>
              <div className="story-avatar-wrap" style={{ width: '40px', height: '40px' }}>
                <div className="story-avatar-inner">
                  <span style={styles.avatarLetter}>
                    {username.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={styles.userMeta}>
                <span style={styles.userGreeting}>Welcome,</span>
                <span style={styles.userNameText}>@{username}</span>
              </div>
            </div>
          )}

          {/* Theme Toggle Button */}
          <ThemeToggle onToggled={onThemeToggled} />

          {/* Logout Button */}
          {username && (
            <button
              onClick={logout}
              className="btn-icon"
              title="Logout"
              aria-label="Logout"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    borderBottom: '1px solid var(--border)',
    backgroundColor: 'var(--nav-bg)',
  },
  navContent: {
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandLogo: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.75rem',
    fontWeight: 900,
    letterSpacing: '-0.03em',
  },
  logoSimple: {
    color: 'var(--heading-color)',
    transition: 'color 0.25s ease',
  },
  logoBlog: {
    background: 'var(--ig-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginLeft: '2px',
  },
  navActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  newPostBtn: {
    padding: '0.55rem 1.25rem',
    fontSize: '0.88rem',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
  },
  avatarLetter: {
    fontSize: '0.82rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.15,
  },
  userGreeting: {
    fontSize: '0.72rem',
    color: 'var(--fg-subtle)',
    fontWeight: 500,
  },
  userNameText: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
  },
};
