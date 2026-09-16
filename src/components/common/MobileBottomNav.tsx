"use client";

import React, { useState } from 'react';
import { UserProfile } from '@/types';
import { uploadService } from '@/services';

interface MobileBottomNavProps {
  user: UserProfile | null;
  activeTab?: string;
  onHomeClick: () => void;
  onCreateClick: () => void;
  onSavedClick: () => void;
  onProfileClick: () => void;
}

export function MobileBottomNav({
  user,
  activeTab = 'home',
  onHomeClick,
  onCreateClick,
  onSavedClick,
  onProfileClick,
}: MobileBottomNavProps) {
  const [avatarError, setAvatarError] = useState(false);
  const avatarSrc = user?.avatar_url && !avatarError ? uploadService.getImageUrl(user.avatar_url) : null;

  return (
    <nav
      className="mobile-bottom-nav-container"
      aria-label="Mobile Navigation Bar"
    >
      {/* Home Tab */}
      <button
        type="button"
        style={styles.navBtn}
        onClick={onHomeClick}
        aria-label="Beranda"
        title="Beranda"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </button>

      {/* Explore Tab */}
      <button
        type="button"
        style={styles.navBtn}
        onClick={onHomeClick}
        aria-label="Jelajahi Cerita"
        title="Jelajahi Cerita"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </button>

      {/* Center Create Post Action */}
      <button
        type="button"
        style={styles.createBtn}
        onClick={onCreateClick}
        aria-label="Buat Postingan Baru"
        title="Buat Postingan Baru"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Bookmarks Tab */}
      <button
        type="button"
        style={styles.navBtn}
        onClick={onSavedClick}
        aria-label="Postingan Tersimpan"
        title="Postingan Tersimpan"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill={activeTab === 'saved' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

      {/* Profile Tab */}
      <button
        type="button"
        style={styles.navBtn}
        onClick={onProfileClick}
        aria-label="Profil Pengguna"
        title="Profil Pengguna"
      >
        {avatarSrc ? (
          <div style={styles.avatarWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarSrc}
              alt={user?.username || 'User'}
              onError={() => setAvatarError(true)}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          </div>
        ) : (
          <div style={styles.defaultAvatar}>
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
        )}
      </button>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--fg-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    cursor: 'pointer',
    borderRadius: '50%',
    transition: 'transform 0.15s ease',
  },
  createBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF5A36 0%, #EC4899 45%, #6366F1 100%)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(236, 72, 153, 0.45)',
    transform: 'translateY(-3px)',
  },
  avatarWrap: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '2px solid var(--fg-main)',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAvatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    background: 'var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
};
