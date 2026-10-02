"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ReplyTarget } from './CommentList';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  loading: boolean;
  error?: string;
  /** When set, the form acts as a reply input targeting the given comment/user */
  replyTarget?: ReplyTarget | null;
  /** Called when the user cancels/dismisses the reply target */
  onCancelReply?: () => void;
}

export function CommentForm({
  onSubmit,
  loading,
  error,
  replyTarget,
  onCancelReply,
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isReplyMode = Boolean(replyTarget);

  // Auto-focus when reply target appears
  useEffect(() => {
    if (replyTarget && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTarget]);

  // Clear content when reply is cancelled
  useEffect(() => {
    if (!replyTarget) {
      setContent('');
    }
  }, [replyTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content.trim());
    setContent('');
  };

  const placeholder = isReplyMode
    ? `Tulis balasan untuk @${replyTarget!.replyToUsername}...`
    : 'Tulis komentar yang bermakna...';

  const submitLabel = isReplyMode ? 'Kirim Balasan' : 'Kirim Komentar';
  const loadingLabel = isReplyMode ? 'Mengirim...' : 'Memposting...';

  return (
    <div style={styles.wrapper} className="glass">
      {/* Error banner */}
      {error && <div style={styles.errorMsg}>{error}</div>}

      {/* Reply target banner */}
      {isReplyMode && replyTarget && (
        <div style={styles.replyBanner}>
          <div style={styles.replyBannerLeft}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, color: 'var(--ig-primary)' }}
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
            <span>
              Membalas{' '}
              <strong style={{ color: 'var(--ig-primary)' }}>
                @{replyTarget.replyToUsername}
              </strong>
            </span>
          </div>
          <button
            type="button"
            style={styles.cancelReplyBtn}
            onClick={onCancelReply}
            aria-label="Batalkan balasan"
            title="Batalkan balasan"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={isReplyMode ? 2 : 3}
          required
          disabled={loading}
          style={{
            ...styles.textarea,
            borderColor: isReplyMode ? 'var(--ig-primary)' : undefined,
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && isReplyMode) {
              onCancelReply?.();
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              if (content.trim() && !loading) handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          aria-label={isReplyMode ? 'Kotak balasan' : 'Kotak komentar'}
        />

        <div style={styles.formFooter}>
          <span style={{ fontSize: '0.78rem', color: 'var(--fg-subtle)' }}>
            Ctrl+Enter untuk kirim
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isReplyMode && (
              <button
                type="button"
                onClick={onCancelReply}
                style={styles.cancelBtn}
                disabled={loading}
              >
                Batal
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.4rem',
                fontSize: '0.88rem',
                background: isReplyMode
                  ? 'linear-gradient(135deg, var(--ig-primary), var(--brand-pink))'
                  : undefined,
              }}
              disabled={loading || !content.trim()}
            >
              {loading ? loadingLabel : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    padding: '1.35rem 1.5rem',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  errorMsg: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#F87171',
    padding: '0.7rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.88rem',
    border: '1px solid rgba(239, 68, 68, 0.22)',
  },
  replyBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.55rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    background: 'var(--tag-bg)',
    border: '1px solid var(--border)',
    fontSize: '0.85rem',
    color: 'var(--fg-muted)',
    animation: 'fadeInDown 0.22s ease',
  },
  replyBannerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  cancelReplyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.2rem',
    color: 'var(--fg-muted)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
    minWidth: '28px',
    minHeight: '28px',
    transition: 'color 0.18s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  textarea: {
    borderRadius: 'var(--radius-md)',
    fontSize: '0.94rem',
    lineHeight: 1.6,
    transition: 'border-color 0.2s ease',
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    background: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    color: 'var(--fg-muted)',
    borderRadius: 'var(--radius-md)',
    padding: '0.5rem 1rem',
    fontSize: '0.88rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
  },
};
