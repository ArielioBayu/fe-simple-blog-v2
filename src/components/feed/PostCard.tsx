"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Post } from '@/types';
import { postService, uploadService } from '@/services';

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
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);

  // Fetch real-time like count and comment count from BE Modul 7 endpoints
  useEffect(() => {
    let ignore = false;

    async function loadCounters() {
      try {
        const [likesRes, commentsRes] = await Promise.allSettled([
          postService.getLikeCount(post.id),
          postService.getCommentCount(post.id),
        ]);

        if (!ignore) {
          if (likesRes.status === 'fulfilled' && likesRes.value?.data?.like_count !== undefined) {
            setLikeCount(likesRes.value.data.like_count);
          }
          if (commentsRes.status === 'fulfilled' && commentsRes.value?.data?.comment_count !== undefined) {
            setCommentCount(commentsRes.value.data.comment_count);
          }
        }
      } catch {
        // ignore
      }
    }

    loadCounters();

    return () => {
      ignore = true;
    };
  }, [post.id]);

  const handleLike = () => {
    onLikeToggle(post);
    setLikeCount((prev) => {
      if (prev === null) return post.is_liked ? 0 : 1;
      return post.is_liked ? Math.max(0, prev - 1) : prev + 1;
    });
  };

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

  const imagePath = post.file_path || post.filepath;
  const directImageUrl = imagePath ? uploadService.getImageUrl(imagePath) : null;
  const imageMatch = post.post_content.match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = directImageUrl || (imageMatch ? imageMatch[1] : null);
  const rawText = imageMatch ? post.post_content.replace(imageMatch[0], '').trim() : post.post_content;
  const postSnippet = rawText.length > 250 ? `${rawText.substring(0, 250)}...` : rawText;

  // Filter out empty hashtags
  const validTags = (post.post_hashtags || [])
    .map((t) => t.trim().replace(/^#/, ''))
    .filter((t) => t.length > 0);

  return (
    <article style={styles.postCard} className="glass glass-interactive">
      {/* Card Header: Author Profile */}
      <div style={styles.cardHeader}>
        <div style={styles.authorRow}>
          <div className="story-avatar-wrap" style={{ width: '40px', height: '40px' }}>
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

        {/* Share Button */}
        <button
          onClick={() => onShare(post.id, post.post_title)}
          style={styles.headerActionBtn}
          title="Share Story"
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

      {/* Cover Image if attached */}
      {imageUrl && (
        <Link href={`/posts/${post.id}`} style={styles.coverLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={post.post_title} style={styles.coverImg} />
        </Link>
      )}

      {/* Card Content */}
      <div style={styles.cardBody}>
        <Link href={`/posts/${post.id}`}>
          <h3 style={styles.postTitle}>{post.post_title}</h3>
        </Link>

        {postSnippet && (
          <p style={styles.postSnippet}>
            {postSnippet}
          </p>
        )}

        {/* Hashtags */}
        {validTags.length > 0 && (
          <div style={styles.tagList}>
            {validTags.map((tag, idx) => (
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
          {/* Like Button with Counter */}
          <button
            onClick={handleLike}
            style={{
              ...styles.actionIconBtn,
              color: post.is_liked ? 'var(--ig-heart)' : 'var(--fg-muted)',
            }}
            className={isHeartAnimating ? 'animate-heart-pop' : ''}
            title={post.is_liked ? 'Unlike' : 'Like'}
            aria-label={post.is_liked ? 'Unlike cerita ini' : 'Sukai cerita ini'}
          >
            <svg
              width="23"
              height="23"
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
            {likeCount !== null && (
              <span style={styles.actionCount}>{likeCount}</span>
            )}
          </button>

          {/* Comment Link with Counter */}
          <Link
            href={`/posts/${post.id}`}
            style={styles.actionIconBtn}
            title="Lihat komentar"
            aria-label={`Buka komentar untuk postingan ${post.post_title}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            {commentCount !== null && (
              <span style={styles.actionCount}>{commentCount}</span>
            )}
          </Link>

          {/* Share Button */}
          <button
            onClick={() => onShare(post.id, post.post_title)}
            style={styles.actionIconBtn}
            title="Bagikan cerita"
            aria-label="Bagikan tautan cerita ini"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          title={isSaved ? 'Hapus Simpanan' : 'Simpan Cerita'}
          aria-label={isSaved ? 'Hapus cerita dari tersimpan' : 'Simpan cerita ini'}
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

      {/* Social Proof & Comments Link */}
      <div style={styles.cardFooterStats}>
        <div style={styles.likesRow}>
          <span style={styles.likesText}>
            {likeCount !== null ? (
              <>
                <strong>{likeCount}</strong> {likeCount === 1 ? 'like' : 'likes'}
                {post.is_liked && ' • Liked by you'}
              </>
            ) : post.is_liked ? (
              'Liked by you'
            ) : (
              'Be the first to like'
            )}
          </span>
        </div>

        <Link href={`/posts/${post.id}`} style={styles.viewCommentsLink}>
          {commentCount !== null && commentCount > 0
            ? `View all ${commentCount} comments →`
            : 'View full story & comments →'}
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
    gap: '0.75rem',
  },
  authorLetter: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  authorMeta: {
    display: 'flex',
    flexDirection: 'column',
  },
  authorNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  authorName: {
    fontWeight: 800,
    fontSize: '0.95rem',
    color: 'var(--heading-color)',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#0095F6',
    color: '#ffffff',
    fontSize: '0.6rem',
    fontWeight: 800,
    lineHeight: 1,
  },
  postDate: {
    fontSize: '0.75rem',
    color: 'var(--fg-subtle)',
  },
  headerActionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    padding: '0.4rem',
    minWidth: '44px',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'var(--transition)',
  },
  coverLink: {
    display: 'block',
    width: '100%',
    maxHeight: '340px',
    overflow: 'hidden',
    backgroundColor: 'var(--bg-input)',
    borderRadius: 'var(--radius-md)',
  },
  coverImg: {
    width: '100%',
    maxHeight: '340px',
    objectFit: 'cover',
    display: 'block',
    borderRadius: 'var(--radius-md)',
    transition: 'transform 0.35s ease',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  postTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    lineHeight: '1.35',
    transition: 'var(--transition)',
  },
  postSnippet: {
    fontSize: '0.92rem',
    lineHeight: '1.6',
    color: 'var(--fg-main)',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.2rem',
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
    padding: '0.45rem 0.65rem',
    minWidth: '44px',
    minHeight: '44px',
    borderRadius: 'var(--radius-full)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    justifyContent: 'center',
    transition: 'var(--transition)',
  },
  actionCount: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'inherit',
  },
  cardFooterStats: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    paddingTop: '0.15rem',
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

