"use client";

import React from 'react';
import { PostDetail } from '@/types';
import { uploadService } from '@/services';

interface PostDetailCardProps {
  post: PostDetail;
  likedCount: number;
  commentCount?: number;
  isSaved: boolean;
  isHeartAnimating: boolean;
  onLikeToggle: () => void;
  onBookmarkToggle: () => void;
  onShare: () => void;
}

export function PostDetailCard({
  post,
  likedCount,
  commentCount,
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

  // Extract image path from field or fallback to embedded markdown
  const imagePath = post.file_path || post.filepath;
  const directImageUrl = imagePath ? uploadService.getImageUrl(imagePath) : null;
  const imageMatch = post.post_content.match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = directImageUrl || (imageMatch ? imageMatch[1] : null);
  const rawText = imageMatch ? post.post_content.replace(imageMatch[0], '').trim() : post.post_content;

  // Filter valid non-empty hashtags
  const validTags = (post.post_hashtags || [])
    .map((t) => t.trim().replace(/^#/, ''))
    .filter((t) => t.length > 0);

  return (
    <article style={styles.card} className="glass">
      {/* Header: Author info & Share button */}
      <div style={styles.header}>
        <div style={styles.authorRow}>
          <div className="story-avatar-wrap" style={{ width: '46px', height: '46px' }}>
            <div className="story-avatar-inner">
              <span style={styles.authorLetter}>
                {post.username ? post.username.substring(0, 2).toUpperCase() : 'U'}
              </span>
            </div>
          </div>
          <div style={styles.authorMeta}>
            <div style={styles.authorNameRow}>
              <span style={styles.authorName}>@{post.username}</span>
              <span style={styles.verifiedBadge} title="Verified Creator" aria-label="Verified Creator">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#0095F6">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </span>
            </div>
            <span style={styles.postDate}>{formatDate(post.created_at)}</span>
          </div>
        </div>

        <button onClick={onShare} style={styles.shareBtn} title="Share Story" aria-label="Share story">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>

      {/* Post Title */}
      <h1 style={styles.postTitle}>{post.post_title}</h1>

      {/* Visual Cover Photo */}
      {imageUrl && (
        <div style={styles.coverWrapper}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={post.post_title} style={styles.coverImg} />
        </div>
      )}

      {/* Post Text / Caption Content */}
      {rawText && (
        <div style={styles.postContent}>
          {rawText
            .split('\n')
            .filter(Boolean)
            .map((para, idx) => (
              <p key={idx} style={{ marginBottom: '0.85rem' }}>
                {para}
              </p>
            ))}
        </div>
      )}

      {/* Hashtags (Only render when valid tags exist) */}
      {validTags.length > 0 && (
        <div style={styles.tagList}>
          {validTags.map((tag, idx) => (
            <span key={idx} style={styles.tagBadge}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Bar (Like, Count, Bookmark) */}
      <div style={styles.actionBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={onLikeToggle}
            style={{
              ...styles.actionIconBtn,
              color: post.is_liked ? 'var(--ig-heart)' : 'var(--fg-muted)',
            }}
            className={isHeartAnimating ? 'animate-heart-pop' : ''}
            title={post.is_liked ? 'Unlike' : 'Like'}
            aria-label="Like story"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={post.is_liked ? 'var(--ig-heart)' : 'none'}
              stroke={post.is_liked ? 'var(--ig-heart)' : 'currentColor'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: post.is_liked ? 'drop-shadow(0 0 8px rgba(255, 48, 64, 0.5))' : 'none',
              }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>

          <span style={styles.likesCount}>
            <strong>{likedCount}</strong> {likedCount === 1 ? 'person likes' : 'people like'} this story
            {commentCount !== undefined && (
              <> • <strong>{commentCount}</strong> {commentCount === 1 ? 'comment' : 'comments'}</>
            )}
          </span>
        </div>

        <button
          onClick={onBookmarkToggle}
          style={{
            ...styles.actionIconBtn,
            color: isSaved ? 'var(--secondary)' : 'var(--fg-muted)',
          }}
          title={isSaved ? 'Remove Bookmark' : 'Bookmark'}
          aria-label="Bookmark story"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={isSaved ? 'var(--secondary)' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </div>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '2rem 2.25rem',
    borderRadius: 'var(--radius-xl)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  authorLetter: {
    fontSize: '0.92rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  authorMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  authorNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  authorName: {
    fontWeight: 800,
    fontSize: '1rem',
    color: 'var(--heading-color)',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '15px',
    height: '15px',
    borderRadius: '50%',
    backgroundColor: '#0095F6',
    color: '#ffffff',
    fontSize: '0.62rem',
    fontWeight: 800,
    lineHeight: 1,
  },
  postDate: {
    fontSize: '0.78rem',
    color: 'var(--fg-subtle)',
  },
  shareBtn: {
    background: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    color: 'var(--fg-muted)',
    width: '44px',
    height: '44px',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  postTitle: {
    fontSize: '1.85rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    lineHeight: '1.3',
    letterSpacing: '-0.02em',
    marginTop: '0.15rem',
  },
  coverWrapper: {
    width: '100%',
    maxHeight: '620px',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImg: {
    width: '100%',
    maxHeight: '620px',
    objectFit: 'contain',
    display: 'block',
    borderRadius: 'var(--radius-lg)',
  },
  postContent: {
    fontSize: '1.02rem',
    lineHeight: '1.7',
    color: 'var(--fg-main)',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
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
    marginTop: '0.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.45rem',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: 'var(--radius-full)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition)',
  },
  likesCount: {
    fontSize: '0.9rem',
    color: 'var(--fg-muted)',
  },
};

