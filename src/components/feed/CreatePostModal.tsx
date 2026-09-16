"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context';
import { CreatePostRequest } from '@/types';
import { uploadService } from '@/services';

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
  const [attachedImagePath, setAttachedImagePath] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const res = await uploadService.uploadImage(file);
      if (res.data?.file_path) {
        setAttachedImagePath(res.data.file_path);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const hashtagsArr = hashtags
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(t => t.length > 0);

    // If there is an attached image, embed it in markdown if not already embedded
    let finalContent = content.trim();
    if (attachedImagePath) {
      const fullUrl = uploadService.getImageUrl(attachedImagePath);
      if (fullUrl && !finalContent.includes(fullUrl)) {
        finalContent = `${finalContent}\n\n![Cover Photo](${fullUrl})`;
      }
    }

    try {
      await onSubmit({
        post_title: title,
        post_content: finalContent,
        post_hashtags: hashtagsArr,
      });

      setTitle('');
      setContent('');
      setHashtags('');
      setAttachedImagePath(null);
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

  const previewUrl = attachedImagePath ? uploadService.getImageUrl(attachedImagePath) : null;

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
                {user?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={uploadService.getImageUrl(user.avatar_url)!}
                    alt={username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={styles.avatarLetter}>
                    {username.substring(0, 2).toUpperCase()}
                  </span>
                )}
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
              rows={4}
              required
            />
          </div>

          {/* Attached Image Preview */}
          {previewUrl && (
            <div style={styles.imagePreviewWrap}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Attached cover" style={styles.previewImage} />
              <button
                type="button"
                style={styles.removeImageBtn}
                onClick={() => setAttachedImagePath(null)}
                title="Remove image"
              >
                &times;
              </button>
            </div>
          )}

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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginRight: 'auto', fontSize: '0.82rem', padding: '0.5rem 0.95rem' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || loading}
            >
              {uploadingImage ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="spinner" style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                  Uploading...
                </span>
              ) : (
                'ðŸ“· Attach Photo'
              )}
            </button>

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
              disabled={loading || uploadingImage || !title.trim() || !content.trim()}
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
    width: '40px',
    height: '40px',
    minWidth: '40px',
    minHeight: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1.4rem',
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
  imagePreviewWrap: {
    position: 'relative',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    maxHeight: '180px',
    border: '1px solid var(--border)',
  },
  previewImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover',
    display: 'block',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'rgba(0, 0, 0, 0.65)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '26px',
    height: '26px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.85rem',
    marginTop: '0.75rem',
  },
};

