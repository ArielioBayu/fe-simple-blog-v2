"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Comment, CommentReply } from '@/types';
import { commentService } from '@/services';
import { uploadService } from '@/services';

export interface ReplyTarget {
  commentId: number;
  replyToUserId: number;
  replyToUsername: string;
}

function Avatar({
  avatarUrl,
  username,
  size = 36,
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
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={username}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span
          style={{
            fontSize: size * 0.32,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1,
            fontFamily: 'var(--font-outfit)',
          }}
        >
          {username.substring(0, 2).toUpperCase()}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
      <textarea
        ref={textareaRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={2}
        disabled={loading}
        style={{
          borderRadius: 'var(--radius-md)',
          fontSize: '0.86rem',
          lineHeight: 1.45,
          padding: '0.45rem 0.65rem',
          resize: 'vertical',
          minHeight: '52px',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: '0.35rem 1rem', fontSize: '0.8rem' }}
          onClick={handleSave}
          disabled={loading || !val.trim()}
        >
          {loading ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          className="btn"
          style={{
            padding: '0.35rem 0.85rem',
            fontSize: '0.8rem',
            background: 'var(--btn-secondary-bg)',
            border: '1px solid var(--border)',
            color: 'var(--fg-muted)',
            borderRadius: 'var(--radius-md)',
          }}
          onClick={onCancel}
          disabled={loading}
        >
          Batal
        </button>
        <span style={{ fontSize: '0.72rem', color: 'var(--fg-subtle)', alignSelf: 'center' }}>
          Ctrl+Enter untuk simpan
        </span>
      </div>
    </div>
  );
}

// ── Single Reply Item ────────────────────────────────────────────────────────
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
    <div style={replyStyles.replyItem}>
      <div style={{ flexShrink: 0 }}>
        <Avatar avatarUrl={reply.avatar_url} username={reply.username} size={24} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Author row */}
        <div style={replyStyles.replyHeader}>
          <button
            type="button"
            style={replyStyles.usernameBtn}
            onClick={() => onUserClick?.(reply.user_id, reply.username)}
            aria-label={`Lihat profil @${reply.username}`}
          >
            @{reply.username}
          </button>
          {reply.reply_to_username && (
            <span style={replyStyles.replyingTo}>
              ↩ @{reply.reply_to_username}
            </span>
          )}
          <span style={replyStyles.timestamp}>{formatRelativeTime(reply.created_at)}</span>
        </div>

        {/* Content or inline editor */}
        {isEditing ? (
          <InlineEditInput
            initialValue={reply.reply_content}
            onSave={handleEdit}
            onCancel={() => setIsEditing(false)}
            loading={editLoading}
          />
        ) : (
          <p style={replyStyles.replyContent}>{reply.reply_content}</p>
        )}

        {/* Action buttons */}
        {!isEditing && (
          <div style={replyStyles.actionRow}>
            {currentUserId && onReply && (
              <button
                type="button"
                style={replyStyles.microBtn}
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
                style={replyStyles.microBtn}
                onClick={() => setIsEditing(true)}
                aria-label="Edit balasan"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                style={{ ...replyStyles.microBtn, color: 'var(--ig-heart)' }}
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

// ── Single Comment Card ──────────────────────────────────────────────────────
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
        // Keep previously paginated replies only if they are real server IDs
        // and eliminate any temporary optimistic replies (id >= 1000000000000) or identical content
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

  // Auto-expand replies when user submits a new reply to this card
  useEffect(() => {
    if (autoExpand) {
      setRepliesExpanded(true);
    }
  }, [autoExpand]);

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
        // Deduplicate by id
        const existingIds = new Set(prev.map((r) => r.id));
        const merged = [...prev, ...newReplies.filter((r) => !existingIds.has(r.id))];
        return merged;
      });
      const totalPages = res.pagination?.total_page ?? 1;
      setTotalReplies(res.pagination?.total_data ?? newReplies.length);
      setHasMoreReplies(page < totalPages);
      setRepliesPage(page);
    } catch {
      // silent — already loaded initial replies from parent
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleToggleReplies = () => {
    if (!repliesExpanded && replies.length === 0 && totalReplies > 0) {
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
    <div style={cardStyles.card} className="glass">
      {/* Comment header row */}
      <div style={cardStyles.header}>
        <button
          type="button"
          style={cardStyles.authorBtn}
          onClick={() => onUserClick?.(comment.user_id, comment.username)}
          aria-label={`Lihat profil @${comment.username}`}
        >
          <Avatar avatarUrl={comment.avatar_url} username={comment.username} size={30} />
          <div>
            <span style={cardStyles.username}>@{comment.username}</span>
            <span style={cardStyles.timestamp}>{formatRelativeTime(comment.created_at)}</span>
          </div>
        </button>

        {/* Action menu (edit / delete) */}
        {(canEdit || canDelete) && (
          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
            {canEdit && (
              <button
                type="button"
                style={cardStyles.iconActionBtn}
                onClick={() => setIsEditing(true)}
                title="Edit komentar"
                aria-label="Edit komentar"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                style={{ ...cardStyles.iconActionBtn, color: 'var(--ig-heart)' }}
                onClick={handleDelete}
                disabled={deleteLoading}
                title="Hapus komentar"
                aria-label="Hapus komentar"
              >
                {deleteLoading ? (
                  <span style={{ fontSize: '0.7rem' }}>...</span>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        <p style={cardStyles.body}>{comment.comment_content}</p>
      )}

      {/* Footer: Reply button + Replies toggle */}
      {!isEditing && (
        <div style={cardStyles.footer}>
          {currentUserId && (
            <button
              type="button"
              style={cardStyles.replyBtn}
              onClick={() =>
                onReply({
                  commentId: comment.id,
                  replyToUserId: comment.user_id,
                  replyToUsername: comment.username,
                })
              }
              aria-label={`Balas komentar @${comment.username}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 17 4 12 9 7" />
                <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
              </svg>
              Balas
            </button>
          )}

          {totalReplies > 0 && (
            <button
              type="button"
              style={cardStyles.showRepliesBtn}
              onClick={handleToggleReplies}
              aria-expanded={repliesExpanded}
            >
              {repliesExpanded ? (
                <>▲ Sembunyikan balasan</>
              ) : (
                <>▼ Lihat {totalReplies} balasan</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Replies list (expandable) */}
      {repliesExpanded && (
        <div style={cardStyles.repliesContainer}>
          {/* Thread connector line */}
          <div style={cardStyles.threadLine} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
              />
            ))}

            {repliesLoading && (
              <div style={{ fontSize: '0.82rem', color: 'var(--fg-subtle)', paddingLeft: '0.5rem' }}>
                Memuat balasan...
              </div>
            )}

            {hasMoreReplies && !repliesLoading && (
              <button
                type="button"
                style={cardStyles.loadMoreBtn}
                onClick={handleLoadMoreReplies}
              >
                Lihat balasan lainnya...
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main CommentList Component ───────────────────────────────────────────────
interface CommentListProps {
  comments: Comment[];
  currentUserId?: number | null;
  postOwnerId?: number;
  onUserClick?: (userId: number, username?: string) => void;
  onReply: (target: ReplyTarget) => void;
  onToast: (msg: string) => void;
  onCommentDeleted: (commentId: number) => void;
  onCommentUpdated: (commentId: number, newContent: string) => void;
  activeReplyCommentId?: number | null;
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
}: CommentListProps) {
  if (!comments || comments.length === 0) {
    return (
      <div style={listStyles.empty} className="glass">
        <div style={{ fontSize: '2rem' }}>💬</div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--heading-color)' }}>
          Belum ada komentar
        </h4>
        <p style={{ fontSize: '0.88rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
          Jadilah yang pertama berbagi pendapat!
        </p>
      </div>
    );
  }

  return (
    <div style={listStyles.list}>
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
          autoExpand={activeReplyCommentId === comment.id}
        />
      ))}
    </div>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────
function formatRelativeTime(dateStr: string): string {
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

// ── Styles ───────────────────────────────────────────────────────────────────
const listStyles: Record<string, React.CSSProperties> = {
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  },
  empty: {
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.35rem',
  },
};

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    padding: '0.7rem 0.95rem',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    transition: 'var(--transition)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  authorBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: 0,
    textAlign: 'left',
  },
  username: {
    display: 'block',
    fontWeight: 700,
    fontSize: '0.84rem',
    color: 'var(--heading-color)',
    lineHeight: 1.25,
  },
  timestamp: {
    display: 'block',
    fontSize: '0.72rem',
    color: 'var(--fg-subtle)',
    lineHeight: 1.2,
  },
  body: {
    fontSize: '0.86rem',
    lineHeight: '1.45',
    color: 'var(--fg-main)',
    paddingLeft: '0.15rem',
    margin: 0,
    wordBreak: 'break-word',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    paddingLeft: '0.15rem',
  },
  replyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.76rem',
    fontWeight: 600,
    color: 'var(--fg-muted)',
    padding: '0.15rem 0',
    transition: 'color 0.18s',
  },
  showRepliesBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.76rem',
    fontWeight: 600,
    color: 'var(--ig-primary)',
    padding: '0.15rem 0',
  },
  repliesContainer: {
    display: 'flex',
    gap: '0.55rem',
    marginTop: '0.15rem',
    paddingLeft: '0.35rem',
  },
  threadLine: {
    width: '2px',
    borderRadius: '2px',
    background: 'var(--border)',
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  loadMoreBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.76rem',
    fontWeight: 600,
    color: 'var(--ig-primary)',
    padding: '0.15rem 0',
    textAlign: 'left',
  },
  iconActionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--fg-muted)',
    transition: 'background 0.18s, color 0.18s',
    minWidth: '24px',
    minHeight: '24px',
  },
};

const replyStyles: Record<string, React.CSSProperties> = {
  replyItem: {
    display: 'flex',
    gap: '0.45rem',
    alignItems: 'flex-start',
  },
  replyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    flexWrap: 'wrap',
    marginBottom: '0.1rem',
  },
  usernameBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.8rem',
    color: 'var(--heading-color)',
    padding: 0,
  },
  replyingTo: {
    fontSize: '0.74rem',
    color: 'var(--ig-primary)',
    fontWeight: 500,
  },
  timestamp: {
    fontSize: '0.7rem',
    color: 'var(--fg-subtle)',
  },
  replyContent: {
    fontSize: '0.82rem',
    lineHeight: 1.42,
    color: 'var(--fg-main)',
    margin: 0,
    wordBreak: 'break-word',
  },
  actionRow: {
    display: 'flex',
    gap: '0.55rem',
    marginTop: '0.2rem',
  },
  microBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--fg-muted)',
    padding: 0,
    transition: 'color 0.18s',
  },
};
