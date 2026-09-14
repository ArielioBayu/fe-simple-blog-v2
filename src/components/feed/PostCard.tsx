"use client";

import React from 'react';
import Link from 'next/link';
import { Post } from '@/types';

interface PostCardProps {
  post: Post;
  isSaved: boolean;
  isHeartAnimating: boolean;
  onLikeToggle: (post: Post) => void;
  onBookmarkToggle: (postId: number) => void;
  onShare: (postId: number, title: string) => void;
  onSelectTag: (tag: string) => void;
}

export function PostCard({
  post,
  isSaved,
  isHeartAnimating,
  onLikeToggle,
  onBookmarkToggle,
  onShare,
  onSelectTag,
}: PostCardProps) {
  const formatDate = (dateStr: string) => {
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
    <article style={styles.postCard} className="glass glass-interactive">
      {/* Card Header: Author Profile */}
      <div style={styles.cardHeader}>
        <div style={styles.authorRow}>
          <div className="story-avatar-wrap" style={{ width: '40px', height: '40px' }}>
            <div className="story-avatar-inner">
              <span style={styles.authorLetter}>
                {post.username.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div style={styles.authorInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={styles.authorName}>@{post.username}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#0095F6">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="9 12 11 14 15 10" fill="none" stroke="#fff" strokeWidth="2.5"></polyline>
              </svg>
            </div>
            <span style={styles.postDate}>{formatDate(post.created_at)}</span>
          </div>
        </div>

        {/* Top Right Share Icon */}
        <button
          style={styles.moreBtn}
          onClick={() => onShare(post.id, post.post_title)}
          title="Share post"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        </button>
      </div>

      {/* Card Content */}
      <div style={styles.cardBody}>
        <Link href={`/posts/${post.id}`}>
          <h3 style={styles.postTitle}>{post.post_title}</h3>
        </Link>

        <p style={styles.postSnippet}>
          {post.post_content.length > 250
            ? `${post.post_content.substring(0, 250)}...`
            : post.post_content}
        </p>

        {/* Hashtags */}
        {post.post_hashtags && post.post_hashtags.length > 0 && (
          <div style={styles.tagList}>
            {post.post_hashtags.map((tag, idx) => (
              <button
                key={idx}
                style={styles.tagBadge}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectTag(tag.toLowerCase());
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Instagram-Style Action Bar */}
      <div style={styles.actionBar}>
        <div style={styles.actionLeft}>
          {/* Like Button */}
          <button
            onClick={() => onLikeToggle(post)}
            style={{
              ...styles.actionIconBtn,
              color: post.is_liked ? 'var(--ig-heart)' : 'var(--fg-muted)',
            }}
            className={isHeartAnimating ? 'animate-heart-pop' : ''}
            title={post.is_liked ? 'Unlike' : 'Like'}
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

          {/* Comment Link */}
          <Link
            href={`/posts/${post.id}`}
            style={styles.actionIconBtn}
            title="Comment on post"
          >
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </Link>

          {/* Share Button */}
          <button
            onClick={() => onShare(post.id, post.post_title)}
            style={styles.actionIconBtn}
            title="Share"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>

        {/* Bookmark Button */}
        <button
          onClick={() => onBookmarkToggle(post.id)}
          style={{
            ...styles.actionIconBtn,
            color: isSaved ? 'var(--secondary)' : 'var(--fg-muted)',
          }}
          title={isSaved ? 'Remove Bookmark' : 'Bookmark'}
        >
          <svg
            width="23"
            height="23"
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

      {/* Social Proof & Comments Link */}
      <div style={styles.cardFooterStats}>
        <div style={styles.likesRow}>
          <span style={styles.likesText}>
            {post.is_liked ? 'Liked by you' : 'Be the first to like'}
          </span>
        </div>

        <Link href={`/posts/${post.id}`} style={styles.viewCommentsLink}>
          View full story & comments &rarr;
        </Link>
      </div>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  postCard: {
    borderRadius: 'var(--radius-lg)',
    padding: '1.65rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.15rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  },
  authorLetter: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  authorInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
  },
  authorName: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: 'var(--heading-color)',
  },
  postDate: {
    fontSize: '0.75rem',
    color: 'var(--fg-subtle)',
  },
  moreBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    padding: '0.35rem',
    borderRadius: 'var(--radius-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  postTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    lineHeight: '1.3',
    transition: 'color 0.2s ease',
  },
  postSnippet: {
    color: 'var(--fg-muted)',
    fontSize: '0.95rem',
    lineHeight: '1.65',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.35rem',
  },
  tagBadge: {
    fontSize: '0.78rem',
    fontWeight: 600,
    padding: '0.25rem 0.7rem',
    borderRadius: 'var(--radius-full)',
    background: 'var(--tag-bg)',
    border: '1px solid var(--tag-border)',
    color: 'var(--tag-color)',
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '0.85rem',
    borderTop: '1px solid var(--border)',
  },
  actionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  actionIconBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    padding: '0.4rem',
    borderRadius: 'var(--radius-full)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition)',
  },
  cardFooterStats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    paddingTop: '0.25rem',
  },
  likesRow: {
    display: 'flex',
    alignItems: 'center',
  },
  likesText: {
    fontWeight: 600,
    color: 'var(--fg-muted)',
    fontSize: '0.85rem',
  },
  viewCommentsLink: {
    fontWeight: 600,
    color: 'var(--secondary)',
    fontSize: '0.85rem',
    transition: 'var(--transition)',
  },
};
