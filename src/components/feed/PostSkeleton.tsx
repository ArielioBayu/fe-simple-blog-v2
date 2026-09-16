"use client";

import React from 'react';

export function PostSkeleton() {
  return (
    <div style={styles.card} className="glass animate-fade-in" aria-hidden="true">
      {/* Header Skeleton */}
      <div style={styles.header}>
        <div className="skeleton-shimmer" style={styles.avatarSkeleton} />
        <div style={styles.headerText}>
          <div className="skeleton-shimmer" style={styles.usernameSkeleton} />
          <div className="skeleton-shimmer" style={styles.metaSkeleton} />
        </div>
      </div>

      {/* Media Image Skeleton */}
      <div className="skeleton-shimmer" style={styles.mediaSkeleton} />

      {/* Actions Skeleton */}
      <div style={styles.actionBar}>
        <div style={styles.actionLeft}>
          <div className="skeleton-shimmer" style={styles.iconSkeleton} />
          <div className="skeleton-shimmer" style={styles.iconSkeleton} />
          <div className="skeleton-shimmer" style={styles.iconSkeleton} />
        </div>
        <div className="skeleton-shimmer" style={styles.iconSkeleton} />
      </div>

      {/* Content Lines Skeleton */}
      <div style={styles.contentLines}>
        <div className="skeleton-shimmer" style={styles.lineLong} />
        <div className="skeleton-shimmer" style={styles.lineMedium} />
        <div className="skeleton-shimmer" style={styles.lineShort} />
      </div>
    </div>
  );
}

export function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {Array.from({ length: count }).map((_, index) => (
        <PostSkeleton key={index} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: '100%',
    borderRadius: 'var(--radius-lg, 16px)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  avatarSkeleton: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  usernameSkeleton: {
    width: '140px',
    height: '14px',
    borderRadius: '6px',
  },
  metaSkeleton: {
    width: '90px',
    height: '11px',
    borderRadius: '6px',
  },
  mediaSkeleton: {
    width: '100%',
    height: '320px',
    borderRadius: 'var(--radius-md, 12px)',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.25rem 0',
  },
  actionLeft: {
    display: 'flex',
    gap: '12px',
  },
  iconSkeleton: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
  },
  contentLines: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  lineLong: {
    width: '92%',
    height: '13px',
    borderRadius: '6px',
  },
  lineMedium: {
    width: '75%',
    height: '13px',
    borderRadius: '6px',
  },
  lineShort: {
    width: '45%',
    height: '13px',
    borderRadius: '6px',
  },
};
