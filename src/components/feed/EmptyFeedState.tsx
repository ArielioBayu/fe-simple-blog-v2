"use client";

import React from 'react';

interface EmptyFeedStateProps {
  activeTag?: string;
  feedMode?: 'explore' | 'following';
  onResetTag?: () => void;
  onSwitchToExplore?: () => void;
  onCreatePost: () => void;
}

export function EmptyFeedState({
  activeTag = 'all',
  feedMode = 'explore',
  onResetTag,
  onSwitchToExplore,
  onCreatePost,
}: EmptyFeedStateProps) {
  const isFiltered = activeTag !== 'all';
  const isFollowingMode = feedMode === 'following';

  let title = 'Belum Ada Cerita Menarik';
  let subtitle = 'Jadilah kreator pertama yang membagikan momen dan cerita inspiratif kepada teman dan komunitas Anda.';

  if (isFiltered) {
    title = `Belum ada cerita di #${activeTag}`;
    subtitle = `Tidak ditemukan postingan dengan tagar #${activeTag}. Silakan jelajahi tagar lain atau buat cerita baru dengan tagar ini.`;
  } else if (isFollowingMode) {
    title = 'Belum Ada Cerita dari Akun yang Diikuti';
    subtitle = 'Anda belum mengikuti kreator atau akun yang Anda ikuti belum mengunggah cerita terbaru. Temukan kreator inspiratif di tab Untuk Anda!';
  }

  return (
    <div style={styles.card} className="glass animate-fade-in" role="status">
      {/* Icon Badge */}
      <div style={styles.iconBadge}>
        {isFollowingMode && !isFiltered ? (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--social-blue, #0095F6)' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        ) : (
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#EC4899' }}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        )}
      </div>

      <h3 style={styles.title}>
        {title}
      </h3>

      <p style={styles.subtitle}>
        {subtitle}
      </p>

      <div style={styles.buttonGroup}>
        {isFiltered && onResetTag && (
          <button
            type="button"
            className="btn btn-secondary"
            style={styles.secondaryBtn}
            onClick={onResetTag}
          >
            Lihat Semua Cerita
          </button>
        )}

        {isFollowingMode && onSwitchToExplore && (
          <button
            type="button"
            className="btn btn-secondary"
            style={styles.secondaryBtn}
            onClick={onSwitchToExplore}
          >
            Jelajahi Untuk Anda
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary"
          style={styles.primaryBtn}
          onClick={onCreatePost}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Buat Cerita Pertama</span>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '3.25rem 2rem',
    borderRadius: 'var(--radius-lg, 16px)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box',
    width: '100%',
    margin: '1rem 0',
  },
  iconBadge: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.14) 0%, rgba(255, 90, 54, 0.08) 70%)',
    border: '1px solid rgba(236, 72, 153, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
    boxShadow: '0 8px 24px rgba(236, 72, 153, 0.12)',
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: 700,
    fontFamily: 'var(--font-display, "Outfit", sans-serif)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
    color: 'var(--heading-color)',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: 'var(--fg-muted)',
    maxWidth: '440px',
    lineHeight: 1.55,
    marginBottom: '1.75rem',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    justifyContent: 'center',
  },
  secondaryBtn: {
    padding: '0.65rem 1.25rem',
    borderRadius: 'var(--radius-full, 9999px)',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.65rem 1.4rem',
    borderRadius: 'var(--radius-full, 9999px)',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    backgroundColor: 'var(--social-blue, #0095F6)',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 149, 246, 0.3)',
  },
};
