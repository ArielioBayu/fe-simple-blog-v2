"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Comment, CommentReply } from '@/types';
import { commentService, uploadService } from '@/services';

export interface ReplyTarget {
  commentId: number;
  replyToUserId: number;
  replyToUsername: string;
}

// ── Avatar Component with Gradient Ring Fallback ──────────────────────────────
function Avatar({
  avatarUrl,
  username,
  size = 34,
}: {
  avatarUrl?: string;
  username: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = avatarUrl && !imgError ? uploadService.getImageUrl(avatarUrl) : null;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg, var(--brand-coral), var(--brand-pink))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        border: '1.5px solid rgba(255, 255, 255, 0.15)',
      }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={username}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span
          style={{
            fontSize: Math.max(10, size * 0.36),
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1,
            fontFamily: 'var(--font-outfit)',
            letterSpacing: '0.02em',
          }}
        >
          {username ? username.substring(0, 2).toUpperCase() : '??'}
        </span>
      )}
    </div>
  );
}

// ── Inline Edit Textarea ─────────────────────────────────────────────────────
function InlineEditInput({
  initialValue,
  onSave,
  onCancel,
  loading,
}: {
  initialValue: string;
  onSave: (val: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [val, setVal] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const handleSave = async () => {
    if (!val.trim() || val.trim() === initialValue.trim()) {
      onCancel();
      return;
    }
    await onSave(val.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.35rem', width: '100%' }}>
      <textarea
        ref={textareaRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={2}
        disabled={loading}
        style={{
          width: '100%',
          borderRadius: '10px',
          fontSize: '0.86rem',
          lineHeight: 1.5,
          padding: '0.55rem 0.75rem',
          resize: 'vertical',
          minHeight: '56px',
          backgroundColor: 'var(--bg-input, rgba(255, 255, 255, 0.05))',
          border: '1px solid var(--border)',
          color: 'var(--fg-main)',
          fontFamily: 'var(--font-sans)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.18s, box-shadow 0.18s',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--ig-primary)';
          e.target.style.boxShadow = '0 0 0 3px rgba(0, 149, 246, 0.18)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '0.3rem 0.9rem', fontSize: '0.78rem', borderRadius: '8px' }}
          onClick={handleSave}
          disabled={loading || !val.trim()}
        >
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.78rem',
            background: 'var(--btn-secondary-bg)',
            border: '1px solid var(--border)',
            color: 'var(--fg-muted)',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
          onClick={onCancel}
          disabled={loading}
        >
          Batal
        </button>
        <span style={{ fontSize: '0.7rem', color: 'var(--fg-subtle)', marginLeft: 'auto' }}>
          Ctrl+Enter untuk simpan
        </span>
      </div>
    </div>
  );
}

// ── Single Reply Item (Conversation Style) ───────────────────────────────────
function ReplyItem({
  reply,
  commentId,
  currentUserId,
  postOwnerId,
  onUserClick,
  onReply,
  onDeleted,
  onUpdated,
  onToast,
  isHighlighted,
}: {
  reply: CommentReply;
  commentId: number;
  currentUserId?: number | null;
  postOwnerId?: number;
  onUserClick?: (userId: number, username?: string) => void;
  onReply?: (target: ReplyTarget) => void;
  onDeleted: (replyId: number) => void;
  onUpdated: (replyId: number, newContent: string) => void;
  onToast: (msg: string) => void;
  isHighlighted?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEdit = currentUserId !== null && currentUserId === reply.user_id;
  const canDelete =
    currentUserId !== null &&
    (currentUserId === reply.user_id || currentUserId === postOwnerId);

  const handleEdit = async (newContent: string) => {
    setEditLoading(true);
    try {
      await commentService.updateReply(reply.id, newContent);
      onUpdated(reply.id, newContent);
      onToast('Balasan berhasil diperbarui.');
      setIsEditing(false);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Gagal memperbarui balasan.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await commentService.deleteReply(reply.id);
      onDeleted(reply.id);
      onToast('Balasan berhasil dihapus.');
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Gagal menghapus balasan.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div
      id={`reply-${reply.id}`}
      style={{
        display: 'flex',
        gap: '0.65rem',
        alignItems: 'flex-start',
        position: 'relative',
        transition: 'background 0.25s ease',
        borderRadius: '10px',
        padding: isHighlighted ? '0.45rem 0.65rem' : '0.2rem 0',
      }}
      className={isHighlighted ? 'comment-highlight-pulse' : ''}
    >
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        <Avatar avatarUrl={reply.avatar_url} username={reply.username} size={26} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', lineHeight: 1.3 }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: 'var(--heading-color)',
              padding: 0,
              fontFamily: 'var(--font-outfit)',
            }}
            onClick={() => onUserClick?.(reply.user_id, reply.username)}
            aria-label={`Lihat profil @${reply.username}`}
          >
            @{reply.username}
          </button>
          {reply.reply_to_username && (
            <span
              style={{
                fontSize: '0.74rem',
                color: 'var(--ig-primary)',
                fontWeight: 500,
                background: 'rgba(0, 149, 246, 0.08)',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
              }}
            >
              ↩ @{reply.reply_to_username}
            </span>
          )}
          <span style={{ fontSize: '0.72rem', color: 'var(--fg-subtle)', marginLeft: 'auto' }}>
            {formatRelativeTime(reply.created_at)}
          </span>
        </div>

        {/* Reply body */}
        {isEditing ? (
          <InlineEditInput
            initialValue={reply.reply_content}
            onSave={handleEdit}
            onCancel={() => setIsEditing(false)}
            loading={editLoading}
          />
        ) : (
          <p
            style={{
              fontSize: '0.84rem',
              lineHeight: 1.5,
              color: 'var(--fg-main)',
              margin: '0.2rem 0 0.35rem 0',
              wordBreak: 'break-word',
            }}
          >
            {reply.reply_content}
          </p>
        )}

        {/* Micro actions */}
        {!isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.15rem' }}>
            {currentUserId && onReply && (
              <button
                type="button"
                style={actionBtnStyle}
                onClick={() =>
                  onReply({
                    commentId,
                    replyToUserId: reply.user_id,
                    replyToUsername: reply.username,
                  })
                }
                aria-label={`Balas @${reply.username}`}
              >
                Balas
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                style={actionBtnStyle}
                onClick={() => setIsEditing(true)}
                aria-label="Edit balasan"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                style={{ ...actionBtnStyle, color: 'var(--ig-heart, #FF3040)' }}
                onClick={handleDelete}
                disabled={deleteLoading}
                aria-label="Hapus balasan"
              >
                {deleteLoading ? '...' : 'Hapus'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Single Comment Row (Clean Conversation First) ────────────────────────────
function CommentCard({
  comment,
  currentUserId,
  postOwnerId,
  onUserClick,
  onReply,
  onDeleted,
  onUpdated,
  onToast,
  autoExpand,
  isHighlighted,
  highlightedReplyId,
}: {
  comment: Comment;
  currentUserId?: number | null;
  postOwnerId?: number;
  onUserClick?: (userId: number, username?: string) => void;
  onReply: (target: ReplyTarget) => void;
  onDeleted: (commentId: number) => void;
  onUpdated: (commentId: number, newContent: string) => void;
  onToast: (msg: string) => void;
  autoExpand?: boolean;
  isHighlighted?: boolean;
  highlightedReplyId?: number | null;
}) {
  const [replies, setReplies] = useState<CommentReply[]>(comment.replies ?? []);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesPage, setRepliesPage] = useState(1);
  const [totalReplies, setTotalReplies] = useState(comment.replies_count ?? replies.length);
  const [hasMoreReplies, setHasMoreReplies] = useState(
    (comment.replies_count ?? 0) > (comment.replies?.length ?? 0),
  );

  // Auto-sync replies and counts when comment prop updates from parent
  useEffect(() => {
    if (comment.replies) {
      setReplies((prev) => {
        const incomingIds = new Set(comment.replies!.map((r) => r.id));
        const extra = prev.filter(
          (r) =>
            !incomingIds.has(r.id) &&
            r.id < 1000000000000 &&
            !comment.replies!.some(
              (inc) =>
                inc.reply_content.trim() === r.reply_content.trim() &&
                inc.username === r.username,
            ),
        );
        return [...comment.replies!, ...extra];
      });
    }
    if (comment.replies_count !== undefined) {
      setTotalReplies(comment.replies_count);
      setHasMoreReplies((comment.replies_count ?? 0) > (comment.replies?.length ?? 0));
    }
  }, [comment.replies, comment.replies_count]);

  // Auto-expand replies when user submits a new reply or when reply is targeted
  useEffect(() => {
    if (autoExpand || (highlightedReplyId && replies.some((r) => r.id === highlightedReplyId))) {
      setRepliesExpanded(true);
    }
  }, [autoExpand, highlightedReplyId, replies]);

  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canEdit = currentUserId !== null && currentUserId === comment.user_id;
  const canDelete =
    currentUserId !== null &&
    (currentUserId === comment.user_id || currentUserId === postOwnerId);

  // Load more replies from API
  const loadReplies = async (page: number) => {
    if (repliesLoading) return;
    setRepliesLoading(true);
    try {
      const res = await commentService.getReplies(comment.id, page, 5);
      const newReplies = res.data ?? [];
      setReplies((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const merged = [...prev, ...newReplies.filter((r) => !existingIds.has(r.id))];
        return merged;
      });
      const totalPages = res.pagination?.total_page ?? 1;
      setTotalReplies(res.pagination?.total_data ?? newReplies.length);
      setHasMoreReplies(page < totalPages);
      setRepliesPage(page);
    } catch {
      onToast('Gagal memuat balasan.');
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (!repliesExpanded && replies.length === 0 && (comment.replies_count ?? 0) > 0) {
      loadReplies(1);
    }
    setRepliesExpanded((prev) => !prev);
  };

  const handleLoadMoreReplies = () => {
    loadReplies(repliesPage + 1);
  };

  const handleEdit = async (newContent: string) => {
    setEditLoading(true);
    try {
      await commentService.updateComment(comment.id, newContent);
      onUpdated(comment.id, newContent);
      onToast('Komentar berhasil diperbarui.');
      setIsEditing(false);
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Gagal memperbarui komentar.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await commentService.deleteComment(comment.id);
      onDeleted(comment.id);
      onToast('Komentar berhasil dihapus.');
    } catch (err: unknown) {
      onToast(err instanceof Error ? err.message : 'Gagal menghapus komentar.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReplyDeleted = (replyId: number) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setTotalReplies((prev) => Math.max(0, prev - 1));
  };

  const handleReplyUpdated = (replyId: number, newContent: string) => {
    setReplies((prev) =>
      prev.map((r) => (r.id === replyId ? { ...r, reply_content: newContent } : r)),
    );
  };

  return (
    <div
      id={`comment-${comment.id}`}
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        position: 'relative',
        padding: isHighlighted ? '0.65rem 0.85rem' : '0.45rem 0.25rem',
        borderRadius: '12px',
        transition: 'background-color 0.25s ease',
      }}
      className={isHighlighted ? 'comment-highlight-pulse' : ''}
    >
      {/* Left: Avatar */}
      <div style={{ flexShrink: 0, marginTop: '2px' }}>
        <Avatar avatarUrl={comment.avatar_url} username={comment.username} size={32} />
      </div>

      {/* Right: Content & Replies */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header line: username, timestamp, and edit/delete actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.86rem',
                color: 'var(--heading-color)',
                padding: 0,
                fontFamily: 'var(--font-outfit)',
              }}
              onClick={() => onUserClick?.(comment.user_id, comment.username)}
              aria-label={`Lihat profil @${comment.username}`}
            >
              @{comment.username}
            </button>
            <span style={{ fontSize: '0.73rem', color: 'var(--fg-subtle)' }}>
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>

          {/* Edit / Delete quick action buttons */}
          {(canEdit || canDelete) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              {canEdit && (
                <button
                  type="button"
                  style={iconActionBtnStyle}
                  onClick={() => setIsEditing(true)}
                  title="Edit komentar"
                  aria-label="Edit komentar"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  style={{ ...iconActionBtnStyle, color: 'var(--ig-heart, #FF3040)' }}
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  title="Hapus komentar"
                  aria-label="Hapus komentar"
                >
                  {deleteLoading ? (
                    <span style={{ fontSize: '0.68rem' }}>...</span>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Comment body */}
        {isEditing ? (
          <InlineEditInput
            initialValue={comment.comment_content}
            onSave={handleEdit}
            onCancel={() => setIsEditing(false)}
            loading={editLoading}
          />
        ) : (
          <p
            style={{
              fontSize: '0.88rem',
              lineHeight: 1.55,
              color: 'var(--fg-main)',
              margin: '0.25rem 0 0.45rem 0',
              wordBreak: 'break-word',
            }}
          >
            {comment.comment_content}
          </p>
        )}

        {/* Footer: Balas action button */}
        {!isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {currentUserId && (
              <button
                type="button"
                style={actionBtnStyle}
                onClick={() =>
                  onReply({
                    commentId: comment.id,
                    replyToUserId: comment.user_id,
                    replyToUsername: comment.username,
                  })
                }
                aria-label={`Balas komentar @${comment.username}`}
              >
                Balas
              </button>
            )}
          </div>
        )}

        {/* Expandable replies toggle */}
        {totalReplies > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.2rem 0',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                fontFamily: 'var(--font-sans)',
                transition: 'color 0.18s ease',
              }}
              onClick={handleToggleReplies}
              aria-expanded={repliesExpanded}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--heading-color)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-muted)')}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '20px',
                  height: '1px',
                  backgroundColor: 'var(--border)',
                  verticalAlign: 'middle',
                }}
              />
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: repliesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.22s ease',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>{repliesExpanded ? 'Sembunyikan balasan' : `Lihat ${totalReplies} balasan`}</span>
            </button>

            {/* Replies List with subtle thread connector line */}
            {repliesExpanded && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '0.45rem',
                  paddingLeft: '0.35rem',
                  position: 'relative',
                }}
              >
                {/* Thin vertical thread connector line */}
                <div
                  style={{
                    width: '1.5px',
                    borderRadius: '2px',
                    background: 'var(--border)',
                    flexShrink: 0,
                    alignSelf: 'stretch',
                    opacity: 0.85,
                  }}
                  aria-hidden="true"
                />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.15rem' }}>
                  {replies.map((reply) => (
                    <ReplyItem
                      key={reply.id}
                      reply={reply}
                      commentId={comment.id}
                      currentUserId={currentUserId}
                      postOwnerId={postOwnerId}
                      onUserClick={onUserClick}
                      onReply={onReply}
                      onDeleted={handleReplyDeleted}
                      onUpdated={handleReplyUpdated}
                      onToast={onToast}
                      isHighlighted={highlightedReplyId === reply.id}
                    />
                  ))}

                  {repliesLoading && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)', padding: '0.2rem 0' }}>
                      Memuat balasan...
                    </div>
                  )}

                  {hasMoreReplies && !repliesLoading && (
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--ig-primary)',
                        padding: '0.25rem 0',
                        textAlign: 'left',
                        fontFamily: 'var(--font-sans)',
                      }}
                      onClick={handleLoadMoreReplies}
                    >
                      Lihat balasan lainnya...
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Notification Matching Helpers ───────────────────────────────────────────
function isCommentMatch(
  comment: Comment,
  highlightCommentId?: string | number,
  highlightActor?: string,
  highlightPreview?: string,
): boolean {
  if (highlightCommentId && Number(highlightCommentId) === comment.id) {
    return true;
  }
  if (highlightActor && comment.username?.toLowerCase() === highlightActor.toLowerCase()) {
    if (!highlightPreview) return true;
    return (comment.comment_content || '').toLowerCase().includes(highlightPreview.toLowerCase());
  }
  return false;
}

function isReplyMatch(
  reply: CommentReply,
  highlightCommentId?: string | number,
  highlightActor?: string,
  highlightPreview?: string,
): boolean {
  if (highlightCommentId && Number(highlightCommentId) === reply.id) {
    return true;
  }
  if (highlightActor && reply.username?.toLowerCase() === highlightActor.toLowerCase()) {
    if (!highlightPreview) return true;
    return (reply.reply_content || '').toLowerCase().includes(highlightPreview.toLowerCase());
  }
  return false;
}

// ── Main CommentList Component ───────────────────────────────────────────────
export interface CommentListProps {
  comments: Comment[];
  currentUserId?: number | null;
  postOwnerId?: number;
  onUserClick?: (userId: number, username?: string) => void;
  onReply: (target: ReplyTarget) => void;
  onToast: (msg: string) => void;
  onCommentDeleted: (commentId: number) => void;
  onCommentUpdated: (commentId: number, newContent: string) => void;
  activeReplyCommentId?: number | null;
  highlightActor?: string;
  highlightPreview?: string;
  highlightCommentId?: string | number;
}

export function CommentList({
  comments,
  currentUserId,
  postOwnerId,
  onUserClick,
  onReply,
  onToast,
  onCommentDeleted,
  onCommentUpdated,
  activeReplyCommentId,
  highlightActor,
  highlightPreview,
  highlightCommentId,
}: CommentListProps) {
  // Find single best matched target for notification deep-linking
  const targetInfo = useMemo(() => {
    if (!highlightCommentId && !highlightActor) return null;

    // 1. Check replies first
    for (const c of comments) {
      if (c.replies) {
        for (const r of c.replies) {
          if (isReplyMatch(r, highlightCommentId, highlightActor, highlightPreview)) {
            return {
              type: 'reply' as const,
              commentId: c.id,
              replyId: r.id,
              domId: `reply-${r.id}`,
            };
          }
        }
      }
    }

    // 2. Check root comments
    for (const c of comments) {
      if (isCommentMatch(c, highlightCommentId, highlightActor, highlightPreview)) {
        return {
          type: 'comment' as const,
          commentId: c.id,
          replyId: null,
          domId: `comment-${c.id}`,
        };
      }
    }

    return null;
  }, [comments, highlightCommentId, highlightActor, highlightPreview]);

  // Auto-scroll to target element with smooth centering
  useEffect(() => {
    if (!targetInfo) return;

    const timer = setTimeout(() => {
      const el = document.getElementById(targetInfo.domId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [targetInfo]);

  if (!comments || comments.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem',
          textAlign: 'center',
          color: 'var(--fg-muted)',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--btn-secondary-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            marginBottom: '0.25rem',
            border: '1px solid var(--border)',
          }}
        >
          💬
        </div>
        <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--heading-color)', margin: 0, fontFamily: 'var(--font-outfit)' }}>
          Belum ada komentar
        </h4>
        <p style={{ fontSize: '0.82rem', color: 'var(--fg-subtle)', margin: 0 }}>
          Mulai percakapan pertama untuk cerita ini!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          postOwnerId={postOwnerId}
          onUserClick={onUserClick}
          onReply={onReply}
          onDeleted={onCommentDeleted}
          onUpdated={onCommentUpdated}
          onToast={onToast}
          autoExpand={activeReplyCommentId === comment.id || targetInfo?.commentId === comment.id}
          isHighlighted={targetInfo?.type === 'comment' && targetInfo.commentId === comment.id}
          highlightedReplyId={
            targetInfo?.type === 'reply' && targetInfo.commentId === comment.id
              ? targetInfo.replyId
              : null
          }
        />
      ))}
    </div>
  );
}

// ── Time Formatter ───────────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr.replace(' ', 'T'));
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'baru saja';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}j`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

// ── Shared Micro Action Button Style ─────────────────────────────────────────
const actionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.74rem',
  fontWeight: 600,
  color: 'var(--fg-subtle)',
  padding: '0.1rem 0',
  fontFamily: 'var(--font-sans)',
  transition: 'color 0.15s ease',
};

const iconActionBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0.2rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
  color: 'var(--fg-subtle)',
  transition: 'background 0.18s, color 0.18s',
  minWidth: '22px',
  minHeight: '22px',
};
