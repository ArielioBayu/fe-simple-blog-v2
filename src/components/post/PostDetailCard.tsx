"use client";

import React from 'react';
import { PostDetail } from '@/types';

interface PostDetailCardProps {
  post: PostDetail;
  likedCount: number;
  isSaved: boolean;
  isHeartAnimating: boolean;
  onLikeToggle: () => void;
  onBookmarkToggle: () => void;
  onShare: () => void;
}

export function PostDetailCard({
  post,
  likedCount,
  isSaved,
  isHeartAnimating,
  onLikeToggle,
  onBookmarkToggle,
  onShare,
}: PostDetailCardProps) {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <article style={styles.postCard} className="glass">
      {/* Post Header */}
      <div style={styles.postHeader}>
        <div style={styles.authorRow}>
          <div className="story-avatar-wrap" style={{ width: '48px', height: '48px' }}>
            <div className="story-avatar-inner">
              <span style={styles.authorAvatarLetter}>
                {post.username.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={styles.authorName}>@{post.username}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#0095F6">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="9 12 11 14 15 10" fill="none" stroke="#fff" strokeWidth="2.5"></polyline>
              </svg>
            </div>
            <span style={styles.postDate}>{formatDate(post.created_at)}</span>
          </div>
        </div>

        <button onClick={onShare} style={styles.shareBtn} title="Share Story">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>

      <h1 style={styles.postTitle}>{post.post_title}</h1>
      
      <div style={styles.divider}></div>

      {/* Post Content */}
      <div style={styles.postContent}>
        {post.post_content.split('\n').map((para, idx) => (
          <p key={idx} style={{ marginBottom: '1.25rem' }}>{para}</p>
        ))}
      </div>

      {/* Hashtags */}
      {post.post_hashtags && post.post_hashtags.length > 0 && (
        <div style={styles.tagList}>
          {post.post_hashtags.map((tag, idx) => (
            <span key={idx} style={styles.tagBadge}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div style={styles.actionBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onLikeToggle}
            style={{
              ...styles.actionIconBtn,
              color: post.is_liked ? 'var(--ig-heart)' : 'var(--fg-muted)',
            }}
            className={isHeartAnimating ? 'animate-heart-pop' : ''}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill={post.is_liked ? 'var(--ig-heart)' : 'none'}
              stroke={post.is_liked ? 'var(--ig-heart)' : 'currentColor'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: post.is_liked ? 'drop-shadow(0 0 10px rgba(255, 48, 64, 0.55))' : 'none',
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>

          <span style={styles.likesCount}>
            <strong>{likedCount}</strong> {likedCount === 1 ? 'person likes' : 'people like'} this story
          </span>
        </div>

        <button
          onClick={onBookmarkToggle}
          style={{
            ...styles.actionIconBtn,
            color: isSaved ? 'var(--secondary)' : 'var(--fg-muted)',
          }}
          title={isSaved ? 'Remove Bookmark' : 'Bookmark'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill={isSaved ? 'var(--secondary)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  postCard: {
    padding: '2.25rem',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  authorAvatarLetter: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  authorName: {
    fontWeight: 800,
    fontSize: '1rem',
    color: 'var(--heading-color)',
  },
  postDate: {
    fontSize: '0.78rem',
    color: 'var(--fg-subtle)',
  },
  shareBtn: {
    background: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    color: 'var(--fg-muted)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  postTitle: {
    fontSize: '2.2rem',
    fontWeight: 900,
    color: 'var(--heading-color)',
    lineHeight: '1.25',
    letterSpacing: '-0.025em',
  },
  divider: {
    height: '1px',
    background: 'var(--border)',
  },
  postContent: {
    fontSize: '1.05rem',
    lineHeight: '1.75',
    color: 'var(--fg-main)',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  tagBadge: {
    fontSize: '0.82rem',
    fontWeight: 600,
    padding: '0.3rem 0.8rem',
    background: 'var(--tag-bg)',
    border: '1px solid var(--tag-border)',
    borderRadius: 'var(--radius-full)',
    color: 'var(--tag-color)',
  },
  actionBar: {
    marginTop: '1rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: 'var(--radius-full)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition)',
  },
  likesCount: {
    fontSize: '0.92rem',
    color: 'var(--fg-muted)',
  },
};
