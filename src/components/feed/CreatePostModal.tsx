"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context';
import { CreatePostRequest } from '@/types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostRequest) => Promise<void>;
}

export function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const { user } = useAuth();
  const username = user?.username || 'Creator';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const hashtagsArr = hashtags
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(t => t.length > 0);

    try {
      await onSubmit({
        post_title: title,
        post_content: content,
        post_hashtags: hashtagsArr,
      });

      setTitle('');
      setContent('');
      setHashtags('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish story');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalNode = (
    <div
      style={styles.modalOverlay}
      className="animate-fade-in"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
    >
      <div style={styles.modalContent} className="glass animate-slide-up">
        {/* Modal Header */}
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="story-avatar-wrap" style={{ width: '38px', height: '38px' }}>
              <div className="story-avatar-inner">
                <span style={styles.avatarLetter}>
                  {username.substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h3 id="create-modal-title" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--heading-color)' }}>
                Create New Story
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
                Publishing as @{username}
              </span>
            </div>
          </div>

          <button style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {error && <div style={styles.errorBanner} role="alert">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.modalForm}>
          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Story Title</label>
            <input
              type="text"
              placeholder="Give your thoughts a vibrant title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Content / Caption</label>
            <textarea
              placeholder="What's happening? Share your thoughts, story, or knowledge..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.inputLabel}>Hashtags (Comma-separated)</label>
            <input
              type="text"
              placeholder="golang, nextjs, react, webdev"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          <div style={styles.modalActions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Discard
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !title.trim() || !content.trim()}
            >
              {loading ? 'Publishing...' : 'Share Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}

const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1.25rem',
    overflowY: 'auto',
  },
  modalContent: {
    width: '100%',
    maxWidth: '560px',
    borderRadius: 'var(--radius-xl)',
    padding: '2rem',
    position: 'relative',
    boxShadow: 'var(--shadow-lg)',
    backgroundColor: 'var(--modal-bg)',
    margin: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  avatarLetter: {
    fontSize: '0.82rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  closeBtn: {
    background: 'var(--btn-secondary-bg)',
    border: 'none',
    color: 'var(--fg-muted)',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'var(--transition)',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#F87171',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.88rem',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    marginBottom: '1rem',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  inputLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--fg-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.85rem',
    marginTop: '0.75rem',
  },
};
