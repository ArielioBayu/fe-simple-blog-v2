"use client";

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context';
import { postService, commentService, activityService, bookmarkService } from '@/services';
import { CommentPagedResponse } from '@/services/comment.service';
import {
  Navbar,
  Toast,
  PostDetailCard,
  CommentForm,
  CommentList,
  UserProfileModal,
  LeftNavSidebar,
  PostSkeleton,
  ErrorState,
} from '@/components';
import { PostDetailResponseData, Comment } from '@/types';
import { ReplyTarget } from '@/components/post/CommentList';

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const postId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  // ── Post data ─────────────────────────────────────────────────────────────
  const [postData, setPostData] = useState<PostDetailResponseData | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);

  // ── Comment state ─────────────────────────────────────────────────────────
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [commentFormLoading, setCommentFormLoading] = useState(false);
  const [commentFormError, setCommentFormError] = useState('');

  // ── Reply state ───────────────────────────────────────────────────────────
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  // ── User Profile Modal ────────────────────────────────────────────────────
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | undefined>(undefined);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  }, []);

  const handleOpenUserProfile = (userId: number, username?: string) => {
    setTargetUserId(userId);
    setTargetUsername(username);
    setIsUserProfileOpen(true);
  };

  // ── Fetch comments from dedicated endpoint ────────────────────────────────
  const fetchComments = useCallback(
    async (page: number, append = false) => {
      setCommentsLoading(true);
      try {
        const res: CommentPagedResponse = await commentService.getComments(postId, page, 10);
        const newComments = res.data ?? [];
        setComments((prev) => {
          const merged = append
            ? [...prev, ...newComments.filter((c) => !prev.some((p) => p.id === c.id))]
            : newComments;
          return [...merged].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime() || a.id;
            const timeB = new Date(b.created_at).getTime() || b.id;
            return timeB - timeA;
          });
        });
        const totalPages = res.pagination?.total_page ?? 1;
        setHasMoreComments(page < totalPages);
        setCommentPage(page);
      } catch {
        // Silently fall back to comments embedded in the post response
      } finally {
        setCommentsLoading(false);
      }
    },
    [postId],
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;

    async function loadPost() {
      try {
        const [postRes, likeRes, commentCountRes] = await Promise.allSettled([
          postService.getPostById(postId),
          postService.getLikeCount(postId),
          postService.getCommentCount(postId),
        ]);

        if (!ignore) {
          if (postRes.status === 'fulfilled' && postRes.value?.data) {
            setPostData(postRes.value.data);
            if (postRes.value.data.detail_post.is_saved !== undefined) {
              setIsSaved(Boolean(postRes.value.data.detail_post.is_saved));
            }
          } else {
            setError('Cerita ini tidak ditemukan atau mungkin telah dihapus.');
          }

          if (likeRes.status === 'fulfilled' && likeRes.value?.data?.like_count !== undefined) {
            setLikeCount(likeRes.value.data.like_count);
          }

          if (
            commentCountRes.status === 'fulfilled' &&
            commentCountRes.value?.data?.comment_count !== undefined
          ) {
            setCommentCount(commentCountRes.value.data.comment_count);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat cerita. Silakan refresh halaman.',
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPost();
    return () => { ignore = true; };
  }, [postId]);

  // ── Fetch comments after post loads ──────────────────────────────────────
  useEffect(() => {
    if (!loading && postData) {
      fetchComments(1, false);
    }
  }, [loading, postData, fetchComments]);

  // ── Like ──────────────────────────────────────────────────────────────────
  const handleLikeToggle = async () => {
    if (!postData) return;
    const currentLiked = postData.detail_post.is_liked;
    const updatedIsLiked = !currentLiked;
    const likeDiff = updatedIsLiked ? 1 : -1;

    if (updatedIsLiked) {
      setIsHeartAnimating(true);
      setTimeout(() => setIsHeartAnimating(false), 400);
    }

    setLikeCount((prev) =>
      prev !== null ? Math.max(0, prev + likeDiff) : postData.liked_count + likeDiff,
    );
    setPostData({
      ...postData,
      detail_post: { ...postData.detail_post, is_liked: updatedIsLiked },
      liked_count: postData.liked_count + likeDiff,
    });

    try {
      await activityService.toggleLike(postId, updatedIsLiked);
    } catch {
      setLikeCount((prev) =>
        prev !== null ? Math.max(0, prev - likeDiff) : postData.liked_count,
      );
      setPostData({
        ...postData,
        detail_post: { ...postData.detail_post, is_liked: currentLiked },
        liked_count: postData.liked_count,
      });
      showToast('Gagal mengubah status suka. Silakan coba lagi.');
    }
  };

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const handleBookmarkToggle = async () => {
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      await bookmarkService.toggleBookmark(postId, nextState);
      showToast(nextState ? 'Disimpan ke koleksi Anda' : 'Dihapus dari koleksi tersimpan');
      try {
        const numId = Number(postId);
        const saved = localStorage.getItem('saved_posts');
        const ids: number[] = saved ? JSON.parse(saved) : [];
        const nextIds = nextState
          ? [...ids.filter((id) => id !== numId), numId]
          : ids.filter((id) => id !== numId);
        localStorage.setItem('saved_posts', JSON.stringify(nextIds));
      } catch { /* ignore */ }
    } catch {
      setIsSaved(!nextState);
      showToast('Gagal mengubah status simpan. Silakan coba lagi.');
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link berhasil disalin ke clipboard!');
        return;
      } catch { /* fallthrough */ }
    }
    showToast('URL: ' + window.location.href);
  };

  // ── Delete post ───────────────────────────────────────────────────────────
  const handleDeletePost = async () => {
    try {
      await postService.deletePost(postId);
      showToast('Postingan berhasil dihapus.');
      setTimeout(() => router.push('/'), 700);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus cerita.');
    }
  };

  // ── Create comment or reply ───────────────────────────────────────────────
  const handleCommentSubmit = async (content: string) => {
    setCommentFormLoading(true);
    setCommentFormError('');

    try {
      if (replyTarget) {
        // REPLY mode: POST /comments/replies/:commentId
        await commentService.createReply(
          replyTarget.commentId,
          content,
          replyTarget.replyToUserId,
        );
        showToast('Balasan berhasil dikirim!');
        setReplyTarget(null);

        // Refresh the comment that received the reply so its replies_count updates
        await fetchComments(1, false);
      } else {
        // ROOT COMMENT mode: POST /posts/comments/:postId
        await commentService.createComment(postId, content);
        showToast('Komentar berhasil dikirim!');

        // Optimistically bump the count then refresh
        setCommentCount((prev) => (prev !== null ? prev + 1 : 1));
        await fetchComments(1, false);

        // Refresh the actual count from the server
        try {
          const countRes = await postService.getCommentCount(postId);
          if (countRes.data?.comment_count !== undefined) {
            setCommentCount(countRes.data.comment_count);
          }
        } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      setCommentFormError(
        err instanceof Error ? err.message : 'Gagal mengirim. Silakan coba lagi.',
      );
    } finally {
      setCommentFormLoading(false);
    }
  };

  // ── Comment CRUD callbacks ────────────────────────────────────────────────
  const handleCommentDeleted = useCallback((commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((prev) => (prev !== null ? Math.max(0, prev - 1) : null));
  }, []);

  const handleCommentUpdated = useCallback((commentId: number, newContent: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, comment_content: newContent } : c)),
    );
  }, []);

  // ── Load more comments ────────────────────────────────────────────────────
  const handleLoadMoreComments = () => {
    fetchComments(commentPage + 1, true);
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.pageContainer} className="animate-fade-in has-left-sidebar">
        <LeftNavSidebar onHomeClick={() => router.push('/')} onToast={showToast} />
        <Navbar showBackToFeed onThemeToggled={(theme) => showToast(`Switched to ${theme} mode`)} />
        <main style={styles.main} className="container">
          <div style={styles.breadcrumbBar}>
            <Link href="/" style={styles.backBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Feed</span>
            </Link>
          </div>
          <PostSkeleton />
        </main>
      </div>
    );
  }

  if (error || !postData) {
    return (
      <div style={styles.pageContainer} className="animate-fade-in has-left-sidebar">
        <LeftNavSidebar onHomeClick={() => router.push('/')} onToast={showToast} />
        <Navbar showBackToFeed onThemeToggled={(theme) => showToast(`Switched to ${theme} mode`)} />
        <main style={styles.main} className="container">
          <div style={styles.breadcrumbBar}>
            <Link href="/" style={styles.backBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Feed</span>
            </Link>
          </div>
          <ErrorState
            title="Cerita Tidak Ditemukan"
            message={error || 'Cerita ini mungkin telah dihapus atau tidak tersedia.'}
            onRetry={() => window.location.reload()}
            retryLabel="Muat Ulang Halaman"
          />
        </main>
      </div>
    );
  }

  const { detail_post, liked_count } = postData;
  const displayCommentCount = commentCount ?? comments.length;

  return (
    <div style={styles.pageContainer} className="animate-fade-in has-left-sidebar">
      <Toast message={toastMessage} />

      {/* Left Navigation Sidebar */}
      <LeftNavSidebar
        onHomeClick={() => (window.location.href = '/')}
        onToast={showToast}
      />

      <Navbar
        showBackToFeed
        onThemeToggled={(theme) => showToast(`Switched to ${theme} mode`)}
      />

      <main style={styles.main} className="container">
        {/* Breadcrumb */}
        <div style={styles.breadcrumbBar}>
          <Link href="/" style={styles.backBtn}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Feed</span>
          </Link>
        </div>

        {/* Post Detail Card */}
        <PostDetailCard
          post={detail_post}
          likedCount={likeCount ?? liked_count}
          commentCount={displayCommentCount}
          isSaved={isSaved}
          isHeartAnimating={isHeartAnimating}
          currentUserId={user?.id}
          onLikeToggle={handleLikeToggle}
          onBookmarkToggle={handleBookmarkToggle}
          onShare={handleShare}
          onUserClick={handleOpenUserProfile}
          onDeletePost={handleDeletePost}
        />

        {/* Comments Section */}
        <section style={styles.commentsSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>
              Komentar{' '}
              <span style={styles.commentCountBadge}>({displayCommentCount})</span>
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--fg-subtle)' }}>
              Berdiskusi dengan sopan
            </span>
          </div>

          {/* Comment / Reply Form */}
          <CommentForm
            onSubmit={handleCommentSubmit}
            loading={commentFormLoading}
            error={commentFormError}
            replyTarget={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
          />

          {/* Comments List */}
          {commentsLoading && comments.length === 0 ? (
            <div style={styles.commentsLoading}>
              <div style={styles.spinnerSm} className="spinner" />
              <span style={{ fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
                Memuat komentar...
              </span>
            </div>
          ) : (
            <CommentList
              comments={comments}
              currentUserId={user?.id}
              postOwnerId={detail_post.user_id}
              onUserClick={handleOpenUserProfile}
              onReply={(target) => setReplyTarget(target)}
              onToast={showToast}
              onCommentDeleted={handleCommentDeleted}
              onCommentUpdated={handleCommentUpdated}
            />
          )}

          {/* Load More Comments */}
          {hasMoreComments && !commentsLoading && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn"
                style={{
                  padding: '0.6rem 1.8rem',
                  background: 'var(--btn-secondary-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-muted)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                }}
                onClick={handleLoadMoreComments}
              >
                Tampilkan lebih banyak komentar
              </button>
            </div>
          )}

          {commentsLoading && comments.length > 0 && (
            <div style={{ textAlign: 'center', padding: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--fg-subtle)' }}>
                Memuat...
              </span>
            </div>
          )}
        </section>
      </main>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        userId={targetUserId}
        fallbackUsername={targetUsername}
        onClose={() => setIsUserProfileOpen(false)}
      />
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
    paddingTop: '1.75rem',
    paddingBottom: '5rem',
    maxWidth: '820px',
    width: '100%',
  },
  breadcrumbBar: {
    marginBottom: '1.25rem',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: 'var(--fg-muted)',
    padding: '0.45rem 0.95rem',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    transition: 'var(--transition)',
  },
  commentsSection: {
    marginTop: '3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
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
  commentsLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1.5rem',
    justifyContent: 'center',
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
  spinnerSm: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2.5px solid var(--border)',
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
