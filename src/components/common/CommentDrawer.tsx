"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react';
import Link from 'next/link';
import { Post, Comment, CommentReply } from '@/types';
import { commentService, uploadService, activityService, bookmarkService, postService } from '@/services';
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
  /** Notify parent with exact count from server when synced */
  onCommentCountSync?: (postId: number, exactCount: number) => void;
  /** Notify parent that like state changed so feed card updates */
  onLikeToggled?: (postId: number, newIsLiked: boolean) => void;
  /** Notify parent that bookmark state changed so feed card updates */
  onBookmarkToggled?: (postId: number, newIsSaved: boolean) => void;
  /** Saved post IDs for bookmark initial state */
  savedPostIds?: number[];
  /** Highlight parameters for notification deep-linking */
  highlightActor?: string;
  highlightPreview?: string;
  highlightCommentId?: string | number;
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

function formatFullDate(dateStr: string): string {
  try {
    const date = new Date(dateStr.replace(' ', 'T'));
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const QUICK_EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🙌', '✨'];

// ── Component ────────────────────────────────────────────────────────────────
export function CommentDrawer({
  post,
  isOpen,
  onClose,
  onToast,
  onCommentCountChange,
  onCommentCountSync,
  onLikeToggled,
  onBookmarkToggled,
  savedPostIds = [],
  highlightActor,
  highlightPreview,
  highlightCommentId,
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
  const [showEmojiBar, setShowEmojiBar] = useState(false);

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

  // ── Open/close animation & scroll locking ────────────────────────────────
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
        }, 240);
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
    if (replyTarget) {
      inputRef.current?.focus();
    }
  }, [replyTarget]);

  // ── Fetch comments ────────────────────────────────────────────────────────
  const fetchComments = useCallback(
    async (page: number, append: boolean) => {
      if (!post) return;
      setCommentsLoading(true);
      try {
        const res = await commentService.getComments(post.id, page, 10);
        const fresh = res.data ?? [];
        setComments((prev) => {
          const merged = append
            ? [...prev, ...fresh.filter((c) => !prev.some((p) => p.id === c.id))]
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
    setIsLiked(next);
    if (next) {
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 450);
    }
    setLikeCount((prev) => (prev !== null ? Math.max(0, prev + (next ? 1 : -1)) : null));
    try {
      await activityService.toggleLike(post.id, next);
      onLikeToggled?.(post.id, next);
    } catch {
      setIsLiked(!next);
      setLikeCount((prev) => (prev !== null ? Math.max(0, prev + (next ? -1 : 1)) : null));
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
    const url = `${window.location.origin}/?postId=${post.id}`;
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

      // Optimistic reply object
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
      setComments((prev) =>
        prev.map((c) =>
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
      onCommentCountChange?.(post.id, 1);
      setInputValue('');
      setReplyTarget(null);

      try {
        await commentService.createReply(targetCommentId, content, targetReplyToUserId);
        onToast('Balasan berhasil dikirim!');
        await fetchComments(1, false);
        try {
          const fresh = await postService.getCommentCount(post.id);
          if (fresh.data?.comment_count !== undefined) {
            onCommentCountSync?.(post.id, fresh.data.comment_count);
          }
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        onToast(err instanceof Error ? err.message : 'Gagal mengirim balasan.');
        onCommentCountChange?.(post.id, -1);
        await fetchComments(1, false);
      } finally {
        setSubmitLoading(false);
      }
    } else {
      // Optimistic new top-level comment
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
      setComments((prev) => [optimisticComment, ...prev]);
      onCommentCountChange?.(post.id, 1);
      setInputValue('');
      setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);

      try {
        await commentService.createComment(post.id, content);
        onToast('Komentar berhasil dikirim!');
        await fetchComments(1, false);
        try {
          const fresh = await postService.getCommentCount(post.id);
          if (fresh.data?.comment_count !== undefined) {
            onCommentCountSync?.(post.id, fresh.data.comment_count);
          }
        } catch {
          // ignore
        }
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
  const handleCommentDeleted = useCallback(
    async (commentId: number) => {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (post) {
        onCommentCountChange?.(post.id, -1);
        try {
          const fresh = await postService.getCommentCount(post.id);
          if (fresh.data?.comment_count !== undefined) {
            onCommentCountSync?.(post.id, fresh.data.comment_count);
          }
        } catch {
          // ignore
        }
      }
    },
    [post, onCommentCountChange, onCommentCountSync],
  );

  const handleCommentUpdated = useCallback((commentId: number, content: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, comment_content: content } : c)),
    );
  }, []);

  // ── Derived media data ────────────────────────────────────────────────────
  const imagePath = post?.file_path || post?.filepath;
  const directImageUrl = imagePath ? uploadService.getImageUrl(imagePath) : null;
  const imageMatch = post?.post_content.match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = directImageUrl || (imageMatch ? imageMatch[1] : null);

  const mediaList = useMemo(() => {
    if (!post) return [];
    if (post.media && post.media.length > 0) return post.media;
    if (imagePath) return [{ file_path: imagePath }];
    if (imageUrl) return [{ file_path: imageUrl }];
    return [];
  }, [post, imagePath, imageUrl]);

  const rawCaption = useMemo(() => {
    if (!post) return '';
    return imageMatch
      ? post.post_content.replace(imageMatch[0], '').trim()
      : post.post_content;
  }, [post, imageMatch]);

  const authorAvatarSrc = post?.avatar_url ? uploadService.getImageUrl(post.avatar_url) : null;
  const isReply = Boolean(replyTarget);

  // Ambient backdrop src
  const ambientBackgroundSrc = useMemo(() => {
    if (mediaList.length > 0) {
      return uploadService.getImageUrl(mediaList[0].file_path) || mediaList[0].file_path;
    }
    return null;
  }, [mediaList]);

  if (!visible || !post) return null;

  return (
    <>
      <style>{`
        /* ================================================================
           CommentDrawer — Modern Social Media Split Modal (Instagram / Threads Inspired)
        ================================================================ */

        .igm-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(8, 11, 18, 0.78);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          box-sizing: border-box;
          animation: igmFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .igm-backdrop.anim-out {
          animation: igmFadeOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes igmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes igmFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* ── Outer Dismiss Button ─────────────────────────────────────── */
        .igm-outer-close {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          color: #FFFFFF;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: background 0.18s, transform 0.18s, color 0.18s;
          z-index: 1210;
        }

        .igm-outer-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.06);
        }

        .igm-outer-close:active {
          transform: scale(0.94);
        }

        /* ── Modal Container ─────────────────────────────────────────── */
        .igm-modal {
          display: flex;
          width: min(94vw, 1220px);
          height: min(90vh, 840px);
          border-radius: 20px;
          overflow: hidden;
          background: var(--modal-bg, #0F172A);
          border: 1px solid var(--border);
          box-shadow: 0 28px 84px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06);
          position: relative;
          z-index: 1205;
          animation: igmModalEnter 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .igm-modal.anim-out {
          animation: igmModalExit 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes igmModalEnter {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes igmModalExit {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.97) translateY(6px);
          }
        }

        /* ── LEFT: Ambient Media Viewer ──────────────────────────────── */
        .igm-left {
          flex: 1 1 58%;
          min-width: 0;
          height: 100%;
          background: #06080E;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .igm-ambient-backdrop {
          position: absolute;
          inset: -30px;
          background-size: cover;
          background-position: center;
          filter: blur(52px) brightness(0.38) saturate(1.4);
          opacity: 0.65;
          transform: scale(1.2);
          pointer-events: none;
          z-index: 0;
          transition: opacity 0.5s ease;
        }

        .igm-ambient-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.65) 100%);
          pointer-events: none;
          z-index: 1;
        }

        .igm-carousel-box {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .igm-carousel-box .image-carousel-wrap {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          aspect-ratio: unset !important;
          border-radius: 0 !important;
          background-color: transparent !important;
        }

        /* ── Text-Only Post Canvas ───────────────────────────────────── */
        .igm-text-cover {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2.5rem;
          text-align: center;
          gap: 1.25rem;
          max-width: 520px;
        }

        .igm-text-cover-badge {
          width: 64px;
          height: 64px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255, 107, 139, 0.18), rgba(240, 148, 51, 0.18));
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
        }

        .igm-text-cover-title {
          font-family: var(--font-outfit);
          font-size: 1.65rem;
          font-weight: 800;
          color: #FFFFFF;
          line-height: 1.35;
          margin: 0;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
        }

        /* ── RIGHT: Conversation Panel ───────────────────────────────── */
        .igm-right {
          flex: 0 0 440px;
          width: 440px;
          max-width: 460px;
          min-width: 380px;
          height: 100%;
          background: var(--modal-bg, #0F172A);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
          z-index: 3;
        }

        /* ── Header ──────────────────────────────────────────────────── */
        .igm-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
          background: var(--modal-bg, #0F172A);
        }

        .igm-header-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand-coral), var(--brand-pink));
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .igm-header-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .igm-header-letter {
          font-size: 0.78rem;
          font-weight: 800;
          color: #FFFFFF;
          font-family: var(--font-outfit);
          line-height: 1;
        }

        .igm-header-meta {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .igm-header-username {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--heading-color);
          text-decoration: none;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-family: var(--font-outfit);
          transition: color 0.15s ease;
        }

        .igm-header-username:hover {
          color: var(--brand-coral);
        }

        .igm-header-sub {
          font-size: 0.74rem;
          color: var(--fg-subtle);
          line-height: 1.2;
        }

        .igm-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .igm-header-link-btn {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--ig-primary);
          text-decoration: none;
          background: rgba(0, 149, 246, 0.08);
          border: 1px solid rgba(0, 149, 246, 0.22);
          padding: 0.35rem 0.8rem;
          border-radius: 9999px;
          transition: all 0.18s ease;
        }

        .igm-header-link-btn:hover {
          background: rgba(0, 149, 246, 0.16);
          border-color: var(--ig-primary);
          transform: translateY(-1px);
        }

        .igm-header-close-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--fg-muted);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s, transform 0.15s;
          padding: 0;
        }

        .igm-header-close-btn:hover {
          background: var(--btn-secondary-hover);
          color: var(--heading-color);
          transform: scale(1.05);
        }

        /* ── Scrollable Conversation Stream ──────────────────────────── */
        .igm-scroll {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1.15rem 1.25rem;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }

        .igm-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .igm-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .igm-scroll::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }

        /* ── Author Caption Section ──────────────────────────────────── */
        .igm-caption-section {
          margin-bottom: 1.25rem;
        }

        .igm-caption-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .igm-caption-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: linear-gradient(135deg, var(--brand-coral), var(--brand-pink));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .igm-caption-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .igm-caption-letter {
          font-size: 0.72rem;
          font-weight: 800;
          color: #FFFFFF;
          font-family: var(--font-outfit);
        }

        .igm-caption-content {
          flex: 1;
          min-width: 0;
        }

        .igm-caption-author-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .igm-caption-username {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--heading-color);
          text-decoration: none;
          font-family: var(--font-outfit);
        }

        .igm-caption-username:hover {
          color: var(--brand-coral);
        }

        .igm-caption-time {
          font-size: 0.74rem;
          color: var(--fg-subtle);
        }

        .igm-caption-text {
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--fg-main);
          margin: 0;
          word-break: break-word;
        }

        .igm-caption-divider {
          height: 1px;
          background: var(--border);
          margin-top: 1.15rem;
          opacity: 0.75;
        }

        /* ── Skeletons ────────────────────────────────────────────────── */
        .igm-skel-row {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          margin-bottom: 1.25rem;
        }

        .igm-skel-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--skeleton-base);
          flex-shrink: 0;
          animation: igmShimmer 1.4s ease infinite;
        }

        .igm-skel-lines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding-top: 0.2rem;
        }

        .igm-skel-line {
          height: 11px;
          border-radius: 6px;
          background: var(--skeleton-base);
          animation: igmShimmer 1.4s ease infinite;
        }

        @keyframes igmShimmer {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.35; }
        }

        /* ── Load more comments button ───────────────────────────────── */
        .igm-load-more {
          width: 100%;
          padding: 0.65rem;
          background: var(--btn-secondary-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--ig-primary);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 1rem;
          transition: background 0.18s, border-color 0.18s;
          font-family: var(--font-sans);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
        }

        .igm-load-more:hover:not(:disabled) {
          background: var(--btn-secondary-hover);
          border-color: var(--border-hover);
        }

        .igm-load-more:disabled {
          opacity: 0.5;
          cursor: default;
        }

        /* ── Interaction Toolbar ─────────────────────────────────────── */
        .igm-actions {
          flex-shrink: 0;
          border-top: 1px solid var(--border);
          padding: 0.75rem 1.25rem 0.5rem;
          background: var(--modal-bg, #0F172A);
        }

        .igm-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .igm-action-left {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .igm-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--fg-main);
          transition: background 0.18s, transform 0.15s, color 0.18s;
          outline: none;
        }

        .igm-icon-btn:hover {
          background: var(--btn-secondary-hover);
          color: var(--heading-color);
        }

        .igm-icon-btn:active {
          transform: scale(0.9);
        }

        .igm-icon-btn:focus-visible {
          box-shadow: 0 0 0 2px var(--social-blue);
        }

        .igm-metrics-row {
          margin-top: 0.4rem;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .igm-like-count {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--heading-color);
          font-family: var(--font-outfit);
        }

        .igm-full-date {
          font-size: 0.7rem;
          color: var(--fg-subtle);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        /* ── Floating Comment Input Bar ──────────────────────────────── */
        .igm-input-bar {
          flex-shrink: 0;
          border-top: 1px solid var(--border);
          padding: 0.75rem 1.25rem 0.95rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          background: var(--modal-bg, #0F172A);
        }

        .igm-reply-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.35rem 0.85rem;
          background: rgba(0, 149, 246, 0.08);
          border: 1px solid rgba(0, 149, 246, 0.2);
          border-radius: 9999px;
          font-size: 0.78rem;
          color: var(--fg-muted);
          animation: igmSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes igmSlideDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .igm-reply-left {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .igm-cancel-reply {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--fg-muted);
          padding: 0.15rem;
          display: inline-flex;
          border-radius: 50%;
          transition: color 0.15s, background 0.15s;
        }

        .igm-cancel-reply:hover {
          color: var(--heading-color);
          background: rgba(255, 255, 255, 0.1);
        }

        /* Quick Emoji Strip */
        .igm-quick-emojis {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.1rem;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .igm-quick-emojis::-webkit-scrollbar {
          display: none;
        }

        .igm-quick-emoji-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0.2rem 0.35rem;
          border-radius: 6px;
          transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.15s;
        }

        .igm-quick-emoji-btn:hover {
          transform: scale(1.25);
          background: rgba(255, 255, 255, 0.08);
        }

        .igm-quick-emoji-btn:active {
          transform: scale(0.95);
        }

        /* Input Container */
        .igm-input-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--bg-input, rgba(255, 255, 255, 0.06));
          border: 1px solid var(--border);
          border-radius: 9999px;
          padding: 0.3rem 0.5rem 0.3rem 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .igm-input-container:focus-within {
          border-color: var(--social-blue, #0095F6);
          background: var(--modal-bg, #0F172A);
          box-shadow: 0 0 0 3px rgba(0, 149, 246, 0.18);
        }

        .igm-text-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-size: 0.9rem;
          font-family: var(--font-sans);
          color: var(--fg-main);
          padding: 0.4rem 0;
          caret-color: var(--ig-primary);
        }

        .igm-text-input::placeholder {
          color: var(--fg-subtle);
          font-size: 0.88rem;
        }

        .igm-emoji-toggle {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
          line-height: 1;
          padding: 0.2rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--fg-muted);
          transition: transform 0.15s, color 0.15s;
        }

        .igm-emoji-toggle:hover {
          transform: scale(1.15);
          color: var(--heading-color);
        }

        .igm-send-btn {
          background: linear-gradient(135deg, var(--brand-coral), var(--brand-pink));
          border: none;
          cursor: pointer;
          color: #FFFFFF;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(225, 48, 108, 0.3);
          transition: opacity 0.18s, transform 0.15s, box-shadow 0.18s;
        }

        .igm-send-btn:not(:disabled):hover {
          transform: scale(1.06);
          box-shadow: 0 4px 12px rgba(225, 48, 108, 0.45);
        }

        .igm-send-btn:not(:disabled):active {
          transform: scale(0.92);
        }

        .igm-send-btn:disabled {
          opacity: 0.3;
          background: var(--btn-secondary-bg);
          color: var(--fg-subtle);
          box-shadow: none;
          cursor: default;
        }

        /* ── Responsive Behavior ─────────────────────────────────────── */
        @media (max-width: 1024px) and (min-width: 768px) {
          .igm-modal {
            width: 96vw;
            height: 88vh;
          }
          .igm-right {
            flex: 0 0 380px;
            width: 380px;
            min-width: 340px;
          }
        }

        @media (max-width: 767px) {
          .igm-backdrop {
            padding: 0;
            align-items: flex-end;
          }

          .igm-outer-close {
            display: none;
          }

          .igm-modal {
            flex-direction: column;
            width: 100vw;
            height: 94dvh;
            max-width: 100vw;
            max-height: 94dvh;
            border-radius: 20px 20px 0 0;
            border-bottom: none;
          }

          .igm-left {
            flex: 0 0 38vh;
            max-height: 38vh;
            width: 100%;
          }

          .igm-right {
            flex: 1;
            width: 100%;
            min-width: 100%;
            max-width: 100%;
            border-left: none;
            border-top: 1px solid var(--border);
          }

          .igm-input-bar {
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
        }

        /* Reduced Motion */
        @media (prefers-reduced-motion: reduce) {
          .igm-backdrop,
          .igm-modal,
          .igm-send-btn,
          .igm-icon-btn {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* ── Frosted Backdrop ─────────────────────────────────────────── */}
      <div
        className={`igm-backdrop${animOut ? ' anim-out' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      >
        {/* Outer Close Button */}
        <button
          type="button"
          className="igm-outer-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Tutup dialog"
          title="Tutup (Esc)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* ── Dialog Container ─────────────────────────────────────────── */}
        <div
          className={`igm-modal${animOut ? ' anim-out' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Detail postingan oleh @${post.username}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── LEFT: Ambient Media Viewer ─────────────────────────────── */}
          <div className="igm-left">
            {ambientBackgroundSrc && (
              <>
                <div
                  className="igm-ambient-backdrop"
                  style={{ backgroundImage: `url("${ambientBackgroundSrc}")` }}
                  aria-hidden="true"
                />
                <div className="igm-ambient-overlay" aria-hidden="true" />
              </>
            )}

            {mediaList.length > 0 ? (
              <div className="igm-carousel-box">
                <ImageCarousel
                  media={mediaList}
                  altText={post.post_title}
                  aspectRatio="auto"
                  maxHeight="100%"
                  objectFit="contain"
                  style={{ width: '100%', height: '100%', borderRadius: 0 }}
                />
              </div>
            ) : (
              /* Text Post Editorial Display */
              <div className="igm-text-cover">
                <div className="igm-text-cover-badge" aria-hidden="true">
                  📖
                </div>
                <h2 className="igm-text-cover-title">{post.post_title}</h2>
              </div>
            )}
          </div>

          {/* ── RIGHT: Conversation Panel ──────────────────────────────── */}
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

              <div className="igm-header-meta">
                <Link
                  href={`/profile/${post.username}`}
                  onClick={onClose}
                  className="igm-header-username"
                  title={`Lihat profil @${post.username}`}
                >
                  @{post.username}
                </Link>
                <span className="igm-header-sub">{formatRelTime(post.created_at)}</span>
              </div>

              <div className="igm-header-actions">
                <Link
                  href={`/profile/${post.username}`}
                  className="igm-header-link-btn"
                  onClick={onClose}
                  title={`Lihat profil @${post.username}`}
                >
                  Profil
                </Link>
                <button
                  type="button"
                  className="igm-header-close-btn"
                  onClick={onClose}
                  aria-label="Tutup dialog"
                  title="Tutup (Esc)"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Conversation Stream */}
            <div className="igm-scroll" ref={scrollRef}>
              {/* Author Caption Section */}
              {rawCaption && (
                <div className="igm-caption-section">
                  <div className="igm-caption-header">
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
                    <div className="igm-caption-content">
                      <div className="igm-caption-author-row">
                        <Link
                          href={`/profile/${post.username}`}
                          onClick={onClose}
                          className="igm-caption-username"
                        >
                          @{post.username}
                        </Link>
                        <span className="igm-caption-time">
                          {formatRelTime(post.created_at)}
                        </span>
                      </div>
                      <p className="igm-caption-text">{rawCaption}</p>
                    </div>
                  </div>
                  <div className="igm-caption-divider" aria-hidden="true" />
                </div>
              )}

              {/* Comments Section */}
              {commentsLoading && comments.length === 0 ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div className="igm-skel-row" key={i}>
                      <div className="igm-skel-circle" />
                      <div className="igm-skel-lines">
                        <div className="igm-skel-line" style={{ width: '45%' }} />
                        <div className="igm-skel-line" style={{ width: '85%' }} />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <CommentList
                    comments={comments}
                    currentUserId={user?.id}
                    postOwnerId={post.user_id}
                    onReply={(target) => setReplyTarget(target)}
                    onToast={onToast}
                    onCommentDeleted={handleCommentDeleted}
                    onCommentUpdated={handleCommentUpdated}
                    activeReplyCommentId={activeReplyCommentId}
                    highlightActor={highlightActor}
                    highlightPreview={highlightPreview}
                    highlightCommentId={highlightCommentId}
                  />

                  {hasMore && (
                    <button
                      type="button"
                      className="igm-load-more"
                      onClick={() => fetchComments(commentPage + 1, true)}
                      disabled={commentsLoading}
                    >
                      {commentsLoading ? (
                        <span>Memuat komentar...</span>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                          <span>Tampilkan komentar lainnya</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* ── Interaction Toolbar ──────────────────────────────────── */}
            <div className="igm-actions">
              <div className="igm-action-row">
                <div className="igm-action-left">
                  {/* Like Button */}
                  <button
                    type="button"
                    className={`igm-icon-btn${heartAnim ? ' animate-heart-pop' : ''}`}
                    onClick={handleLike}
                    aria-label={isLiked ? 'Batal Suka' : 'Suka'}
                    title={isLiked ? 'Batal Suka' : 'Suka'}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={isLiked ? 'var(--ig-heart, #FF3040)' : 'none'}
                      stroke={isLiked ? 'var(--ig-heart, #FF3040)' : 'currentColor'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        filter: isLiked ? 'drop-shadow(0 0 6px rgba(255,48,64,0.45))' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>

                  {/* Comment Focus Button */}
                  <button
                    type="button"
                    className="igm-icon-btn"
                    onClick={() => inputRef.current?.focus()}
                    aria-label="Tulis komentar"
                    title="Komentar"
                  >
                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    className="igm-icon-btn"
                    onClick={handleShare}
                    aria-label="Bagikan postingan"
                    title="Bagikan link"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>

                {/* Bookmark Button */}
                <button
                  type="button"
                  className="igm-icon-btn"
                  onClick={handleBookmark}
                  aria-label={isSaved ? 'Hapus simpanan' : 'Simpan'}
                  title={isSaved ? 'Hapus dari simpanan' : 'Simpan postingan'}
                >
                  <svg
                    width="23"
                    height="23"
                    viewBox="0 0 24 24"
                    fill={isSaved ? 'var(--heading-color)' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>

              {/* Metrics Row */}
              <div className="igm-metrics-row">
                <span className="igm-like-count">
                  {likeCount !== null
                    ? `${likeCount} suka`
                    : isLiked
                    ? 'Disukai oleh kamu'
                    : 'Jadilah yang pertama menyukai'}
                </span>
                <span className="igm-full-date">{formatFullDate(post.created_at)}</span>
              </div>
            </div>

            {/* ── Comment Input Area ───────────────────────────────────── */}
            <div className="igm-input-bar">
              {/* Reply chip */}
              {isReply && replyTarget && (
                <div className="igm-reply-banner">
                  <div className="igm-reply-left">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ig-primary)' }}>
                      <polyline points="9 17 4 12 9 7" />
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                    <span>
                      Membalas <strong style={{ color: 'var(--ig-primary)' }}>@{replyTarget.replyToUsername}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="igm-cancel-reply"
                    onClick={() => setReplyTarget(null)}
                    aria-label="Batalkan balasan"
                    title="Batalkan"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Quick Emojis Drawer */}
              {showEmojiBar && (
                <div className="igm-quick-emojis">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="igm-quick-emoji-btn"
                      onClick={() => {
                        setInputValue((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      title={`Sisipkan ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Row */}
              <div className="igm-input-container">
                <button
                  type="button"
                  className="igm-emoji-toggle"
                  onClick={() => setShowEmojiBar((prev) => !prev)}
                  aria-label="Tampilkan emoji cepat"
                  title="Emoji cepat"
                >
                  😊
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  className="igm-text-input"
                  placeholder={isReply ? `Balas @${replyTarget!.replyToUsername}...` : 'Tambahkan komentar...'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                    if (e.key === 'Escape') {
                      setReplyTarget(null);
                    }
                  }}
                  disabled={submitLoading}
                  aria-label="Tulis komentar"
                />

                <button
                  type="button"
                  className="igm-send-btn"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || submitLoading}
                  aria-label="Kirim komentar"
                  title="Kirim (Enter)"
                >
                  {submitLoading ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
