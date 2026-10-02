"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from 'react';
import Link from 'next/link';
import { Post, Comment, CommentReply } from '@/types';
import { commentService, uploadService, activityService, bookmarkService } from '@/services';
import { CommentList, ReplyTarget } from '@/components/post/CommentList';
import { ImageCarousel } from '@/components/common/ImageCarousel';
import { useAuth } from '@/context';

// ── Types ────────────────────────────────────────────────────────────────────
interface CommentDrawerProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
  /** Notify parent that a comment was added/removed so feed card count updates */
  onCommentCountChange?: (postId: number, delta: number) => void;
  /** Notify parent that like state changed so feed card updates */
  onLikeToggled?: (postId: number, newIsLiked: boolean) => void;
  /** Notify parent that bookmark state changed so feed card updates */
  onBookmarkToggled?: (postId: number, newIsSaved: boolean) => void;
  /** Saved post IDs for bookmark initial state */
  savedPostIds?: number[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRelTime(dateStr: string): string {
  try {
    const date = new Date(dateStr.replace(' ', 'T'));
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'baru saja';
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} jam lalu`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Component ────────────────────────────────────────────────────────────────
export function CommentDrawer({
  post,
  isOpen,
  onClose,
  onToast,
  onCommentCountChange,
  onLikeToggled,
  onBookmarkToggled,
  savedPostIds = [],
}: CommentDrawerProps) {
  const { user } = useAuth();

  // ── Post interaction state ────────────────────────────────────────────────
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);

  // ── Comment data state ────────────────────────────────────────────────────
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // ── Input state ───────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<number | null>(null);

  // ── Animation state ───────────────────────────────────────────────────────
  const [visible, setVisible] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Sync post state when post changes ────────────────────────────────────
  useEffect(() => {
    if (post) {
      setIsLiked(Boolean(post.is_liked));
      setIsSaved(savedPostIds.includes(post.id));
      setLikeCount(null);
    }
  }, [post?.id, post?.is_liked, savedPostIds]);

  // ── Open/close animation ─────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (isOpen) {
      setAnimOut(false);
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      if (visible) {
        setAnimOut(true);
        const t = setTimeout(() => {
          setVisible(false);
          setAnimOut(false);
          document.body.style.overflow = '';
        }, 320);
        return () => clearTimeout(t);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Reset + fetch comments when post/open changes ─────────────────────────
  useEffect(() => {
    if (post && isOpen) {
      setComments([]);
      setCommentPage(1);
      setHasMore(false);
      setInputValue('');
      setReplyTarget(null);
      fetchComments(1, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id, isOpen]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (replyTarget) setReplyTarget(null);
        else onClose();
      }
    };
    if (visible) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, replyTarget, onClose]);

  // ── Auto-focus input on reply ─────────────────────────────────────────────
  useEffect(() => {
    if (replyTarget) inputRef.current?.focus();
  }, [replyTarget]);

  // ── Fetch comments ────────────────────────────────────────────────────────
  const fetchComments = useCallback(
    async (page: number, append: boolean) => {
      if (!post) return;
      setCommentsLoading(true);
      try {
        const res = await commentService.getComments(post.id, page, 10);
        const fresh = res.data ?? [];
        setComments(prev => {
          const merged = append
            ? [...prev, ...fresh.filter(c => !prev.some(p => p.id === c.id))]
            : fresh;
          // Sort root comments newest first (DESC)
          return [...merged].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime() || a.id;
            const timeB = new Date(b.created_at).getTime() || b.id;
            return timeB - timeA;
          });
        });
        setHasMore(page < (res.pagination?.total_page ?? 1));
        setCommentPage(page);
      } catch {
        // ignore
      } finally {
        setCommentsLoading(false);
      }
    },
    [post],
  );

  // ── Like toggle ───────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!post) return;
    const next = !isLiked;
    if (next) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 400);
    }
    setIsLiked(next);
    setLikeCount(prev => (prev !== null ? Math.max(0, prev + (next ? 1 : -1)) : null));
    try {
      await activityService.toggleLike(post.id, next);
      onLikeToggled?.(post.id, next);
    } catch {
      setIsLiked(!next);
      setLikeCount(prev => (prev !== null ? Math.max(0, prev + (next ? -1 : 1)) : null));
      onToast('Gagal mengubah status suka.');
    }
  };

  // ── Bookmark toggle ───────────────────────────────────────────────────────
  const handleBookmark = async () => {
    if (!post) return;
    const next = !isSaved;
    setIsSaved(next);
    try {
      await bookmarkService.toggleBookmark(post.id, next);
      onToast(next ? 'Disimpan ke koleksi Anda' : 'Dihapus dari koleksi tersimpan');
      onBookmarkToggled?.(post.id, next);
    } catch {
      setIsSaved(!next);
      onToast('Gagal mengubah status simpan.');
    }
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!post) return;
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      onToast('Link berhasil disalin ke clipboard!');
    } catch {
      onToast(`URL: ${url}`);
    }
  };

  // ── Submit comment / reply with optimistic instant updates ───────────────
  const handleSubmit = async () => {
    if (!post || !inputValue.trim() || submitLoading) return;
    const content = inputValue.trim();
    setSubmitLoading(true);

    if (replyTarget) {
      const targetCommentId = replyTarget.commentId;
      const targetReplyToUserId = replyTarget.replyToUserId;
      const targetReplyToUsername = replyTarget.replyToUsername;

      // Optimistic reply object — instantly visible in UI without closing or reloading
      const optimisticReply: CommentReply = {
        id: Date.now(),
        comment_id: targetCommentId,
        user_id: user?.id ?? 0,
        username: user?.username ?? 'you',
        avatar_url: user?.avatar_url,
        reply_to_user_id: targetReplyToUserId,
        reply_to_username: targetReplyToUsername,
        reply_content: content,
        created_at: new Date().toISOString(),
      };

      // Immediately append reply to target comment & auto-expand reply list
      setComments(prev =>
        prev.map(c =>
          c.id === targetCommentId
            ? {
                ...c,
                replies_count: (c.replies_count ?? 0) + 1,
                replies: [...(c.replies ?? []), optimisticReply],
              }
            : c,
        ),
      );
      setActiveReplyCommentId(targetCommentId);
      setInputValue('');
      setReplyTarget(null);

      try {
        await commentService.createReply(targetCommentId, content, targetReplyToUserId);
        onToast('Balasan berhasil dikirim!');
        // Silently re-fetch to sync canonical database IDs
        await fetchComments(1, false);
      } catch (err: unknown) {
        onToast(err instanceof Error ? err.message : 'Gagal mengirim balasan.');
        await fetchComments(1, false);
      } finally {
        setSubmitLoading(false);
      }
    } else {
      // Optimistic new top-level comment — instantly visible at the top of history
      const optimisticComment: Comment = {
        id: Date.now(),
        post_id: post.id,
        user_id: user?.id ?? 0,
        username: user?.username ?? 'you',
        avatar_url: user?.avatar_url,
        comment_content: content,
        created_at: new Date().toISOString(),
        replies_count: 0,
        replies: [],
      };

      // Immediately display at the top of comment list
      setComments(prev => [optimisticComment, ...prev]);
      onCommentCountChange?.(post.id, 1);
      setInputValue('');
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);

      try {
        await commentService.createComment(post.id, content);
        onToast('Komentar berhasil dikirim!');
        // Silently re-fetch to sync canonical database record
        await fetchComments(1, false);
      } catch (err: unknown) {
        onToast(err instanceof Error ? err.message : 'Gagal mengirim komentar.');
        onCommentCountChange?.(post.id, -1);
        await fetchComments(1, false);
      } finally {
        setSubmitLoading(false);
      }
    }
  };

  // ── Comment CRUD callbacks ────────────────────────────────────────────────
  const handleCommentDeleted = useCallback((commentId: number) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
    if (post) onCommentCountChange?.(post.id, -1);
  }, [post, onCommentCountChange]);

  const handleCommentUpdated = useCallback((commentId: number, content: string) => {
    setComments(prev =>
      prev.map(c => (c.id === commentId ? { ...c, comment_content: content } : c)),
    );
  }, []);

  if (!visible || !post) return null;

  // ── Derived media data ────────────────────────────────────────────────────
  const imagePath = post.file_path || post.filepath;
  const directImageUrl = imagePath ? uploadService.getImageUrl(imagePath) : null;
  const imageMatch = post.post_content.match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = directImageUrl || (imageMatch ? imageMatch[1] : null);
  const mediaList =
    post.media && post.media.length > 0
      ? post.media
      : imagePath
      ? [{ file_path: imagePath }]
      : imageUrl
      ? [{ file_path: imageUrl }]
      : [];

  const rawCaption = imageMatch
    ? post.post_content.replace(imageMatch[0], '').trim()
    : post.post_content;

  const authorAvatarSrc = post.avatar_url ? uploadService.getImageUrl(post.avatar_url) : null;
  const isReply = Boolean(replyTarget);

  return (
    <>
      <style>{`
        /* ================================================================
           CommentDrawer — Instagram Full-Screen Split Modal
        ================================================================ */

        .igm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.86);
          z-index: 1200;
          animation: igmBackdropIn 0.24s ease forwards;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
        }
        .igm-backdrop.anim-out { animation: igmBackdropOut 0.28s ease forwards; }
        @keyframes igmBackdropIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes igmBackdropOut { from { opacity: 1 } to { opacity: 0 } }

        /* ── Modal container ─────────────────────────────── */
        .igm-modal {
          display: flex;
          width: min(94vw, 1240px);
          height: min(90vh, 680px);
          border-radius: 8px;
          overflow: hidden;
          animation: igmModalIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          flex-shrink: 0;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.7);
          background: #000;
        }
        .igm-modal.anim-out {
          animation: igmModalOut 0.26s cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }
        @keyframes igmModalIn  { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes igmModalOut { from { opacity: 1; transform: scale(1) }    to { opacity: 0; transform: scale(0.95) } }

        /* ── Left: Image panel (takes remaining space, never overflows) ── */
        .igm-left {
          flex: 1;
          min-width: 0;
          height: 100%;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .igm-carousel-box {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .igm-carousel-box .image-carousel-wrap {
          width: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          aspect-ratio: 16 / 10 !important;
          height: auto !important;
          border-radius: 0 !important;
        }

        /* ── Right: Info + Comments panel (enlarged width, comfortable reading) ── */
        .igm-right {
          width: 440px;
          min-width: 380px;
          max-width: 460px;
          flex-shrink: 0;
          background: var(--modal-bg);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
        }

        @media (max-width: 1080px) and (min-width: 768px) {
          .igm-right {
            width: 380px;
            min-width: 340px;
            max-width: 390px;
          }
        }

        /* ── Right / Header ──────────────────────────────── */
        .igm-header {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .igm-header-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand-coral), var(--brand-pink));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .igm-header-avatar img {
          width: 100%; height: 100%; object-fit: cover;
        }
        .igm-header-letter {
          font-size: 0.72rem;
          font-weight: 800;
          color: #fff;
          font-family: var(--font-outfit);
        }
        .igm-header-username {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--heading-color);
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .igm-header-link {
          font-weight: 600;
          font-size: 0.8rem;
          color: var(--ig-primary);
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .igm-header-link:hover { text-decoration: underline; }

        .igm-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--fg-muted);
          padding: 0.35rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          min-width: 32px; min-height: 32px;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .igm-close-btn:hover { background: var(--btn-secondary-hover); color: var(--heading-color); }

        /* ── Right / Scrollable comments ─────────────────── */
        .igm-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0.9rem 1rem;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .igm-scroll::-webkit-scrollbar { width: 4px; }
        .igm-scroll::-webkit-scrollbar-track { background: transparent; }
        .igm-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        /* Author caption (pinned at top of scroll area) */
        .igm-caption {
          display: flex;
          gap: 0.65rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .igm-caption-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand-coral), var(--brand-pink));
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .igm-caption-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .igm-caption-letter {
          font-size: 0.65rem;
          font-weight: 800;
          color: #fff;
          font-family: var(--font-outfit);
        }
        .igm-caption-body { flex: 1; min-width: 0; }
        .igm-caption-username {
          font-weight: 700;
          font-size: 0.86rem;
          color: var(--heading-color);
        }
        .igm-caption-text {
          font-size: 0.86rem;
          line-height: 1.55;
          color: var(--fg-main);
          margin-top: 0.15rem;
          word-break: break-word;
        }
        .igm-caption-time {
          font-size: 0.73rem;
          color: var(--fg-subtle);
          margin-top: 0.25rem;
          display: block;
        }

        /* Load more btn */
        .igm-load-more {
          width: 100%;
          padding: 0.55rem;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--ig-primary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 0.75rem;
          transition: background 0.15s;
          font-family: var(--font-sans);
        }
        .igm-load-more:hover { background: var(--btn-secondary-hover); }

        /* Empty state */
        .igm-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
          gap: 0.4rem;
          text-align: center;
          color: var(--fg-muted);
        }

        /* Skeleton */
        .igm-skel-row { display: flex; gap: 0.6rem; align-items: flex-start; margin-bottom: 1rem; }
        .igm-skel-circle { width: 32px; height: 32px; border-radius: 50%; background: var(--skeleton-base); flex-shrink: 0; animation: igSk 1.3s ease infinite; }
        .igm-skel-lines { flex: 1; display: flex; flex-direction: column; gap: 0.35rem; padding-top: 0.15rem; }
        .igm-skel-line { height: 11px; border-radius: 6px; background: var(--skeleton-base); animation: igSk 1.3s ease infinite; }
        @keyframes igSk { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }

        /* ── Right / Action bar ──────────────────────────── */
        .igm-actions {
          flex-shrink: 0;
          border-top: 1px solid var(--border);
          padding: 0.65rem 1rem 0.45rem;
        }
        .igm-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .igm-action-left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .igm-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.3rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--fg-main);
          border-radius: 4px;
          min-width: 36px; min-height: 36px;
          transition: opacity 0.15s, transform 0.15s;
        }
        .igm-icon-btn:hover { opacity: 0.6; }
        .igm-icon-btn:active { transform: scale(0.88); }
        .igm-like-count {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--heading-color);
          margin-top: 0.3rem;
          display: block;
        }
        .igm-date {
          font-size: 0.72rem;
          color: var(--fg-subtle);
          margin-top: 0.2rem;
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ── Right / Input bar ───────────────────────────── */
        .igm-input-bar {
          flex-shrink: 0;
          border-top: 1px solid var(--border);
          padding: 0.85rem 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          background: var(--modal-bg);
        }
        .igm-reply-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.85rem;
          background: var(--tag-bg);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--fg-muted);
          animation: fadeInDown 0.18s ease;
        }
        .igm-reply-left { display: flex; align-items: center; gap: 0.45rem; }
        .igm-cancel-reply {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--fg-muted);
          padding: 0.2rem;
          display: inline-flex;
          line-height: 1;
          border-radius: 50%;
          transition: color 0.15s, background 0.15s;
        }
        .igm-cancel-reply:hover { color: var(--heading-color); background: var(--btn-secondary-hover); }
        .igm-input-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .igm-emoji-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.45rem;
          line-height: 1;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 50%;
          transition: transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.15s;
          user-select: none;
        }
        .igm-emoji-btn:hover {
          transform: scale(1.18);
          opacity: 1;
        }
        .igm-emoji-btn:active {
          transform: scale(0.95);
        }
        .igm-text-input {
          flex: 1;
          background: var(--input-bg, rgba(255, 255, 255, 0.05));
          border: 1px solid var(--border);
          border-radius: 24px;
          outline: none;
          font-size: 0.95rem;
          font-family: var(--font-sans);
          color: var(--fg-main);
          padding: 0.65rem 1.15rem;
          min-height: 44px;
          box-sizing: border-box;
          caret-color: var(--ig-primary);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .igm-text-input:focus {
          border-color: var(--ig-primary);
          background: var(--modal-bg);
          box-shadow: 0 0 0 3px rgba(0, 149, 246, 0.18);
        }
        .igm-text-input::placeholder {
          color: var(--fg-subtle);
          font-size: 0.92rem;
        }
        .igm-send-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--ig-primary);
          padding: 0.5rem 0.65rem;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.18s, transform 0.12s;
          font-family: var(--font-sans);
          border-radius: var(--radius-sm);
        }
        .igm-send-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .igm-send-btn:not(:disabled):hover {
          opacity: 0.85;
          transform: translateY(-1px);
        }
        .igm-send-btn:not(:disabled):active {
          transform: translateY(0);
        }

        /* Close button positioned inside backdrop at top-right */
        .igm-outer-close {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #fff;
          padding: 0.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          min-width: 40px; min-height: 40px;
          transition: background 0.15s;
          z-index: 10;
        }
        .igm-outer-close:hover { background: rgba(255,255,255,0.12); }

        /* Mobile: stack vertically */
        @media (max-width: 767px) {
          .igm-backdrop {
            padding: 0;
          }
          .igm-modal {
            flex-direction: column;
            width: 100vw;
            height: 100dvh;
            max-width: 100vw;
            max-height: 100dvh;
            border-radius: 0;
          }
          .igm-left {
            aspect-ratio: 16 / 10;
            width: 100%;
            height: auto;
            max-height: 42vh;
            max-width: 100%;
            flex: none;
          }
          .igm-right {
            width: 100%;
            min-width: 100%;
            max-width: 100%;
            flex: 1;
          }
        }
      `}</style>

      {/* ── Backdrop (flex-centers the modal inside it) ─────────────────── */}
      <div
        className={`igm-backdrop${animOut ? ' anim-out' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      >
        {/* ── Close button (top-right of backdrop) ───────────────────────── */}
        <button
          type="button"
          className="igm-outer-close"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Tutup"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ── Modal ──────────────────────────────────────────────────────── */}
        <div
          className={`igm-modal${animOut ? ' anim-out' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Post oleh @${post.username}`}
          onClick={e => e.stopPropagation()}
        >
        {/* ── LEFT: Post image ─────────────────────────────────────────── */}
        <div className="igm-left">
          {mediaList.length > 0 ? (
            <div className="igm-carousel-box">
              <ImageCarousel
                media={mediaList}
                altText={post.post_title}
                aspectRatio="16 / 10"
                maxHeight="100%"
                style={{ width: '100%', height: 'auto', borderRadius: 0 }}
              />
            </div>
          ) : (
            /* No image: show title on dark bg */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '3rem' }}>📖</span>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#fff',
                fontFamily: 'var(--font-outfit)',
                lineHeight: 1.3,
              }}>
                {post.post_title}
              </h2>
            </div>
          )}
        </div>

        {/* ── RIGHT: Info + comments panel ─────────────────────────────── */}
        <div className="igm-right">

          {/* Header */}
          <div className="igm-header">
            <div className="igm-header-avatar">
              {authorAvatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={authorAvatarSrc} alt={post.username} />
              ) : (
                <span className="igm-header-letter">
                  {post.username.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <span className="igm-header-username">@{post.username}</span>
            <Link
              href={`/posts/${post.id}`}
              className="igm-header-link"
              onClick={onClose}
              title="Buka postingan lengkap"
            >
              Lihat post
            </Link>
          </div>

          {/* Scrollable: caption + comments */}
          <div className="igm-scroll" ref={scrollRef}>

            {/* Author caption */}
            {rawCaption && (
              <div className="igm-caption">
                <div className="igm-caption-avatar">
                  {authorAvatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={authorAvatarSrc} alt={post.username} />
                  ) : (
                    <span className="igm-caption-letter">
                      {post.username.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="igm-caption-body">
                  <span className="igm-caption-username">@{post.username} </span>
                  <span className="igm-caption-text">{rawCaption}</span>
                  <span className="igm-caption-time">
                    {formatRelTime(post.created_at)}
                  </span>
                </div>
              </div>
            )}

            {/* Comments */}
            {commentsLoading && comments.length === 0 ? (
              <>
                {[1, 2, 3].map(i => (
                  <div className="igm-skel-row" key={i}>
                    <div className="igm-skel-circle" />
                    <div className="igm-skel-lines">
                      <div className="igm-skel-line" style={{ width: '50%' }} />
                      <div className="igm-skel-line" style={{ width: '80%' }} />
                    </div>
                  </div>
                ))}
              </>
            ) : comments.length === 0 ? (
              <div className="igm-empty">
                <span style={{ fontSize: '1.75rem' }}>💬</span>
                <span style={{ fontWeight: 700, color: 'var(--heading-color)', fontSize: '0.9rem' }}>
                  Belum ada komentar
                </span>
                <span style={{ fontSize: '0.8rem' }}>Jadilah yang pertama!</span>
              </div>
            ) : (
              <>
                <CommentList
                  comments={comments}
                  currentUserId={user?.id}
                  postOwnerId={post.user_id}
                  onReply={target => setReplyTarget(target)}
                  onToast={onToast}
                  onCommentDeleted={handleCommentDeleted}
                  onCommentUpdated={handleCommentUpdated}
                  activeReplyCommentId={activeReplyCommentId}
                />
                {hasMore && (
                  <button
                    type="button"
                    className="igm-load-more"
                    onClick={() => fetchComments(commentPage + 1, true)}
                    disabled={commentsLoading}
                  >
                    {commentsLoading ? 'Memuat...' : 'Tampilkan komentar lainnya'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Action bar ─────────────────────────────────────────────── */}
          <div className="igm-actions">
            <div className="igm-action-row">
              <div className="igm-action-left">
                {/* Like */}
                <button
                  type="button"
                  className={`igm-icon-btn${heartAnim ? ' animate-heart-pop' : ''}`}
                  onClick={handleLike}
                  aria-label={isLiked ? 'Unlike' : 'Like'}
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  <svg
                    width="26" height="26" viewBox="0 0 24 24"
                    fill={isLiked ? 'var(--ig-heart)' : 'none'}
                    stroke={isLiked ? 'var(--ig-heart)' : 'currentColor'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: isLiked ? 'drop-shadow(0 0 6px rgba(255,48,64,0.5))' : 'none' }}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>

                {/* Comment (scroll to input) */}
                <button
                  type="button"
                  className="igm-icon-btn"
                  onClick={() => inputRef.current?.focus()}
                  aria-label="Tulis komentar"
                  title="Komentar"
                >
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </button>

                {/* Share */}
                <button
                  type="button"
                  className="igm-icon-btn"
                  onClick={handleShare}
                  aria-label="Bagikan"
                  title="Bagikan"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>

              {/* Bookmark */}
              <button
                type="button"
                className="igm-icon-btn"
                onClick={handleBookmark}
                aria-label={isSaved ? 'Hapus simpanan' : 'Simpan'}
                title={isSaved ? 'Hapus simpanan' : 'Simpan'}
              >
                <svg
                  width="24" height="24" viewBox="0 0 24 24"
                  fill={isSaved ? 'var(--heading-color)' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>

            {/* Like count */}
            {likeCount !== null ? (
              <span className="igm-like-count">{likeCount} suka</span>
            ) : isLiked ? (
              <span className="igm-like-count">Disukai oleh kamu</span>
            ) : null}

            {/* Date */}
            <span className="igm-date">{formatRelTime(post.created_at)}</span>
          </div>

          {/* ── Fixed input bar ───────────────────────────────────────── */}
          <div className="igm-input-bar">
            {/* Reply banner */}
            {isReply && replyTarget && (
              <div className="igm-reply-banner">
                <div className="igm-reply-left">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ig-primary)' }}>
                    <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                  </svg>
                  <span>Membalas <strong style={{ color: 'var(--ig-primary)' }}>@{replyTarget.replyToUsername}</strong></span>
                </div>
                <button type="button" className="igm-cancel-reply" onClick={() => setReplyTarget(null)} aria-label="Batalkan">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            <div className="igm-input-row">
              <button
                type="button"
                className="igm-emoji-btn"
                aria-label="Sisipkan emoji senyum"
                title="Sisipkan emoji"
                onClick={() => {
                  setInputValue(prev => prev + '🙂');
                  inputRef.current?.focus();
                }}
              >
                🙂
              </button>
              <input
                ref={inputRef}
                type="text"
                className="igm-text-input"
                placeholder={isReply ? `Balas @${replyTarget!.replyToUsername}...` : 'Tambahkan komentar...'}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                  if (e.key === 'Escape') { setReplyTarget(null); }
                }}
                disabled={submitLoading}
                aria-label="Kotak komentar"
              />
              <button
                type="button"
                className="igm-send-btn"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || submitLoading}
              >
                {submitLoading ? '...' : 'Kirim'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
);
}
