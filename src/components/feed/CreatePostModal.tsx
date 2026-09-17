"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context';
import { CreatePostRequest, UploadFileResponseData } from '@/types';
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
  const [attachedUploadId, setAttachedUploadId] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // My Media Gallery State (GET /upload/my-media)
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaList, setMediaList] = useState<UploadFileResponseData[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

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
        if (res.data.id) {
          setAttachedUploadId(Number(res.data.id));
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggleGallery = async () => {
    const nextState = !showMediaGallery;
    setShowMediaGallery(nextState);
    if (nextState && mediaList.length === 0) {
      setLoadingMedia(true);
      try {
        const res = await uploadService.getMyMedia();
        if (res && res.data) {
          setMediaList(res.data);
        }
      } catch {
        // ignore
      } finally {
        setLoadingMedia(false);
      }
    }
  };

  const handleSelectFromGallery = (filePath: string, uploadId?: number) => {
    setAttachedImagePath(filePath);
    if (uploadId) {
      setAttachedUploadId(Number(uploadId));
    }
    setShowMediaGallery(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const hashtagsArr = hashtags
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/^#/, ''))
      .filter(t => t.length > 0);

    const finalContent = content.trim();

    try {
      await onSubmit({
        post_title: title.trim(),
        post_content: finalContent,
        post_hashtags: hashtagsArr,
        file_path: attachedImagePath || undefined,
        filepath: attachedImagePath || undefined,
        upload_id: attachedUploadId || undefined,
      });

      setTitle('');
      setContent('');
      setHashtags('');
      setAttachedImagePath(null);
      setAttachedUploadId(null);
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
                onClick={() => {
                  setAttachedImagePath(null);
                  setAttachedUploadId(null);
                }}
                title="Hapus foto sampul"
              >
                &times;
              </button>
            </div>
          )}

          {/* Media Gallery Panel (GET /upload/my-media) */}
          {showMediaGallery && (
            <div style={styles.galleryContainer}>
              <div style={styles.galleryHeader}>
                <span style={styles.galleryTitle}>Pilih dari Galeri Unggahan Saya</span>
                <button
                  type="button"
                  style={styles.galleryCloseBtn}
                  onClick={() => setShowMediaGallery(false)}
                >
                  &times;
                </button>
              </div>

              {loadingMedia ? (
                <div style={styles.galleryLoading}>
                  <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid var(--social-blue)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>Memuat media Anda...</span>
                </div>
              ) : mediaList.length === 0 ? (
                <div style={styles.galleryEmpty}>
                  <p style={{ fontSize: '0.82rem', color: 'var(--fg-subtle)', margin: 0 }}>
                    Belum ada media yang pernah Anda unggah.
                  </p>
                </div>
              ) : (
                <div style={styles.galleryGrid}>
                  {mediaList.map(media => {
                    const thumbUrl = uploadService.getImageUrl(media.file_path);
                    const isSelected = attachedImagePath === media.file_path;
                    return (
                      <button
                        key={media.id || media.file_path}
                        type="button"
                        onClick={() => handleSelectFromGallery(media.file_path, media.id)}
                        style={{
                          ...styles.galleryItem,
                          borderColor: isSelected ? 'var(--social-blue)' : 'transparent',
                        }}
                        title={media.file_name || 'Media'}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl || ''}
                          alt={media.file_name || 'Upload'}
                          style={styles.galleryImg}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
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
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || loading}
                title="Unggah Foto Baru"
              >
                {uploadingImage ? (
                  <>
                    <span className="spinner" style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    Unggah Foto
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.82rem',
                  padding: '0.45rem 0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: showMediaGallery ? 'var(--bg-active, rgba(0, 149, 246, 0.12))' : undefined,
                  color: showMediaGallery ? 'var(--social-blue)' : undefined,
                }}
                onClick={handleToggleGallery}
                disabled={loading}
                title="Pilih dari Galeri Unggahan"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Galeri Saya
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || uploadingImage || !title.trim() || !content.trim()}
            >
              {loading ? 'Mempublikasikan...' : 'Bagikan Cerita'}
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
  galleryContainer: {
    backgroundColor: 'var(--bg-elevated, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  galleryHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryTitle: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
  },
  galleryCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    fontSize: '1.2rem',
    lineHeight: 1,
    padding: '0 4px',
  },
  galleryLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '1.5rem 0',
  },
  galleryEmpty: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  galleryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '0.5rem',
    maxHeight: '190px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  galleryItem: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: 'var(--radius-sm, 6px)',
    overflow: 'hidden',
    border: '2px solid transparent',
    padding: 0,
    cursor: 'pointer',
    background: 'var(--bg-card)',
    transition: 'var(--transition)',
  },
  galleryImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
};

