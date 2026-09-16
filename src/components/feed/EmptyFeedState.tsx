"use client";

import React from 'react';

interface EmptyFeedStateProps {
  activeTag?: string;
  onResetTag?: () => void;
  onCreatePost: () => void;
}

export function EmptyFeedState({ activeTag = 'all', onResetTag, onCreatePost }: EmptyFeedStateProps) {
  const isFiltered = activeTag !== 'all';

  return (
    <div style={styles.card} className="glass animate-fade-in" role="status">
      {/* Icon Badge */}
      <div style={styles.iconBadge}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#EC4899' }}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      </div>

      <h3 style={styles.title}>
        {isFiltered ? `Belum ada cerita di #${activeTag}` : 'Belum Ada Cerita Menarik'}
      </h3>

      <p style={styles.subtitle}>
        {isFiltered
          ? `Tidak ditemukan postingan dengan tagar #${activeTag}. Silakan jelajahi tagar lain atau buat cerita baru dengan tagar ini.`
          : 'Jadilah kreator pertama yang membagikan momen dan cerita inspiratif kepada teman dan komunitas Anda.'}
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
    padding: '3.5rem 2rem',
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
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, rgba(255, 90, 54, 0.08) 70%)',
    border: '1px solid rgba(236, 72, 153, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
    boxShadow: '0 8px 24px rgba(236, 72, 153, 0.15)',
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: 700,
    fontFamily: 'var(--font-display, "Outfit", sans-serif)',
    letterSpacing: '-0.02em',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--fg-muted)',
    maxWidth: '440px',
    lineHeight: 1.5,
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
    borderRadius: '9999px',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.65rem 1.4rem',
    borderRadius: '9999px',
    fontSize: '0.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    backgroundColor: '#0095F6',
    color: '#FFFFFF',
    border: 'none',
    boxShadow: '0 4px 14px rgba(0, 149, 246, 0.3)',
  },
};
