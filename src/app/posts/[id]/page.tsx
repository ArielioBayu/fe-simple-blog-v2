"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { postService, commentService, activityService } from '@/services';
import { Navbar, Toast, PostDetailCard, CommentForm, CommentList } from '@/components';
import { PostDetailResponseData } from '@/types';

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;

  const [postData, setPostData] = useState<PostDetailResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Comment state
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Toast & Animation
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  // Initial load
  useEffect(() => {
    let ignore = false;

    async function loadPost() {
      try {
        const res = await postService.getPostById(postId);
        if (!ignore) {
          if (res && res.data) {
            setPostData(res.data);
          } else {
            setError('Post details not found.');
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load post.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPost();

    try {
      const saved = localStorage.getItem('saved_posts');
      if (saved) {
        const ids: number[] = JSON.parse(saved);
        const savedStatus = ids.includes(Number(postId));
        queueMicrotask(() => setIsSaved(savedStatus));
      }
    } catch {
      // ignore
    }

    return () => {
      ignore = true;
    };
  }, [postId]);

  const refreshPost = async () => {
    try {
      const res = await postService.getPostById(postId);
      if (res && res.data) {
        setPostData(res.data);
      }
    } catch {
      // ignore
    }
  };

  const handleLikeToggle = async () => {
    if (!postData) return;
    const currentLiked = postData.detail_post.is_liked;
    const updatedIsLiked = !currentLiked;
    const likeDiff = updatedIsLiked ? 1 : -1;

    if (updatedIsLiked) {
      setIsHeartAnimating(true);
      setTimeout(() => setIsHeartAnimating(false), 400);
    }

    setPostData({
      ...postData,
      detail_post: {
        ...postData.detail_post,
        is_liked: updatedIsLiked,
      },
      liked_count: postData.liked_count + likeDiff,
    });

    try {
      await activityService.toggleLike(postId, updatedIsLiked);
    } catch {
      setPostData({
        ...postData,
        detail_post: {
          ...postData.detail_post,
          is_liked: currentLiked,
        },
        liked_count: postData.liked_count - likeDiff,
      });
    }
  };

  const handleBookmarkToggle = () => {
    try {
      const saved = localStorage.getItem('saved_posts');
      const ids: number[] = saved ? JSON.parse(saved) : [];
      const numId = Number(postId);
      const next = isSaved ? ids.filter(id => id !== numId) : [...ids, numId];
      localStorage.setItem('saved_posts', JSON.stringify(next));
      setIsSaved(!isSaved);
      showToast(isSaved ? 'Removed from saved collection' : 'Saved to your collection');
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
        return;
      } catch {
        // ignore
      }
    }
    showToast('Post link ready to share');
  };

  const handleCommentSubmit = async (content: string) => {
    setCommentLoading(true);
    setCommentError('');

    try {
      await commentService.createComment(postId, content);
      showToast('Comment posted!');
      await refreshPost();
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} className="spinner"></div>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem' }}>Loading story & comments...</p>
      </div>
    );
  }

  if (error || !postData) {
    return (
      <div style={styles.errorContainer} className="container animate-fade-in">
        <div style={styles.errorCard} className="glass">
          <div style={{ fontSize: '2.5rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Story Not Found</h3>
          <p style={{ color: 'var(--fg-muted)', margin: '0.5rem 0' }}>
            {error || 'This post may have been removed or is unavailable.'}
          </p>
          <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            &larr; Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  const { detail_post, liked_count, comments } = postData;

  return (
    <div style={styles.pageContainer} className="animate-fade-in">
      <Toast message={toastMessage} />

      <Navbar
        showBackToFeed
        onThemeToggled={theme => showToast(`Switched to ${theme} mode`)}
      />

      <main style={styles.main} className="container">
        {/* Post Detail Card */}
        <PostDetailCard
          post={detail_post}
          likedCount={liked_count}
          isSaved={isSaved}
          isHeartAnimating={isHeartAnimating}
          onLikeToggle={handleLikeToggle}
          onBookmarkToggle={handleBookmarkToggle}
          onShare={handleShare}
        />

        {/* Comments Section */}
        <section style={styles.commentsSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              Comments <span style={styles.commentCountBadge}>({comments ? comments.length : 0})</span>
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--fg-subtle)' }}>
              Join the discussion respectfully
            </span>
          </div>

          {/* Comment Form Component */}
          <CommentForm
            onSubmit={handleCommentSubmit}
            loading={commentLoading}
            error={commentError}
          />

          {/* Comments List Component */}
          <CommentList comments={comments} />
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  main: {
    flex: 1,
    paddingTop: '2.5rem',
    paddingBottom: '5rem',
    maxWidth: '820px',
  },
  commentsSection: {
    marginTop: '3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--heading-color)',
  },
  commentCountBadge: {
    color: 'var(--ig-primary)',
    fontWeight: 800,
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  },
  spinner: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--ig-primary)',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
  },
  errorCard: {
    width: '100%',
    maxWidth: '480px',
    padding: '2.5rem',
    borderRadius: 'var(--radius-xl)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
};
