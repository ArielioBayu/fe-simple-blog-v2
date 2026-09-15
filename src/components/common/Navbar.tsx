"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context';
import { uploadService } from '@/services';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onCreatePost?: () => void;
  onEditProfile?: () => void;
  onThemeToggled?: (theme: string) => void;
  onHomeClick?: () => void;
  showBackToFeed?: boolean;
}

export function Navbar({
  onCreatePost,
  onEditProfile,
  onThemeToggled,
  onHomeClick,
  showBackToFeed = false,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const username = user?.username || '';
  const avatarSrc = user?.avatar_url ? uploadService.getImageUrl(user.avatar_url) : null;

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
            <div
              style={{
                ...styles.userSection,
                cursor: onEditProfile ? 'pointer' : 'default',
              }}
              onClick={onEditProfile}
              title={onEditProfile ? 'Click to edit profile' : undefined}
            >
              <div className="story-avatar-wrap" style={{ width: '40px', height: '40px' }}>
                <div className="story-avatar-inner">
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={styles.avatarLetter}>
                      {username.substring(0, 2).toUpperCase()}
                    </span>
                  )}
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
    borderRadius: 0,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  },
  navContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '70px',
  },
  brandLogo: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.45rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
    userSelect: 'none',
  },
  logoSimple: {
    color: 'var(--heading-color)',
  },
  logoBlog: {
    background: 'var(--ig-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
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
    gap: '0.65rem',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    transition: 'var(--transition)',
  },
  avatarLetter: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  userMeta: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.15,
  },
  userGreeting: {
    fontSize: '0.68rem',
    color: 'var(--fg-subtle)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  userNameText: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
  },
};
