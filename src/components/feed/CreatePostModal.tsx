"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, useTheme, useLanguage } from '@/context';
import { CreatePostRequest, UploadFileResponseData } from '@/types';
import { uploadService } from '@/services';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostRequest) => Promise<void>;
}

interface AttachedMediaItem {
  filePath: string;
  uploadId?: number;
  name?: string;
}

export function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const username = user?.username || 'Creator';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachedMediaList, setAttachedMediaList] = useState<AttachedMediaItem[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

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

  const handleClose = () => {
    if (loading || uploadingImage) return;
    setAnimateOut(true);
    setTimeout(() => {
      setAnimateOut(false);
      onClose();
    }, 280);
  };

  // Lock body scroll and handle Escape key while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !uploadingImage) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, loading, uploadingImage]);

  if ((!isOpen && !animateOut) || !mounted) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (attachedMediaList.length + files.length > 10) {
      setError(`Maksimal 10 gambar per postingan. Anda sudah memiliki ${attachedMediaList.length} gambar.`);
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Foto "${file.name}" melebihi batas 5MB.`);
        return;
      }
    }

    setUploadingImage(true);
    setError('');

    try {
      const newlyUploaded: AttachedMediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgressText(files.length > 1 ? `Mengunggah ${i + 1}/${files.length}...` : 'Mengunggah foto...');
        const res = await uploadService.uploadImage(file);
        if (res.data?.file_path) {
          newlyUploaded.push({
            filePath: res.data.file_path,
            uploadId: res.data.id ? Number(res.data.id) : undefined,
            name: file.name,
          });
        }
      }
      setAttachedMediaList((prev) => [...prev, ...newlyUploaded]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto');
    } finally {
      setUploadingImage(false);
      setUploadProgressText('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
    const exists = attachedMediaList.some((m) => m.filePath === filePath);
    if (exists) {
      // Deselect
      setAttachedMediaList((prev) => prev.filter((m) => m.filePath !== filePath));
      return;
    }

    if (attachedMediaList.length >= 10) {
      setError('Maksimal 10 foto per postingan.');
      return;
    }

    setAttachedMediaList((prev) => [
      ...prev,
      {
        filePath,
        uploadId: uploadId ? Number(uploadId) : undefined,
      },
    ]);
  };

  const handleRemoveMedia = (index: number) => {
    setAttachedMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveMedia = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= attachedMediaList.length ||
      toIndex >= attachedMediaList.length
    ) {
      return;
    }
    setAttachedMediaList((prev) => {
      const updated = [...prev];
      const [movedItem] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, movedItem);
      return updated;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, index: number) => {
    if (dragOverIdx === index) {
      setDragOverIdx(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = draggedIdx ?? Number(e.dataTransfer.getData('text/plain'));
    if (typeof sourceIndex === 'number' && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      handleMoveMedia(sourceIndex, targetIndex);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError('');

    // Automatically parse any hashtags mentioned within the caption content
    const extractedHashtags = (content.match(/#[\w\d_]+/g) || [])
      .map((t) => t.replace('#', '').toLowerCase().trim())
      .filter((t) => t.length > 0);

    const finalContent = content.trim();

    const uploadIds = attachedMediaList
      .map((m) => m.uploadId)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    const primaryFilePath = attachedMediaList[0]?.filePath || undefined;
    const primaryUploadId = attachedMediaList[0]?.uploadId || undefined;

    try {
      await onSubmit({
        post_title: title.trim(),
        post_content: finalContent,
        post_hashtags: extractedHashtags,
        upload_ids: uploadIds.length > 0 ? uploadIds : undefined,
        file_path: primaryFilePath,
        filepath: primaryFilePath,
        upload_id: primaryUploadId,
      });

      setTitle('');
      setContent('');
      setAttachedMediaList([]);
      setShowMediaGallery(false);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mempublikasikan cerita');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const modalNode = (
    <div
      style={styles.modalOverlay}
      className={`create-modal-backdrop ${animateOut ? 'out' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-modal-title"
    >
      <style>{`
        @keyframes createBackdropFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
          }
        }
        @keyframes createBackdropFadeOut {
          from {
            opacity: 1;
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
          }
          to {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
        }
        @keyframes createModalSpringIn {
          0% {
            opacity: 0;
            transform: translateY(28px) scale(0.94);
          }
          65% {
            opacity: 1;
            transform: translateY(-3px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes createModalSpringOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
        }

        .create-modal-backdrop {
          animation: createBackdropFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .create-modal-backdrop.out {
          animation: createBackdropFadeOut 0.24s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .create-modal-card {
          animation: createModalSpringIn 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .create-modal-card.out {
          animation: createModalSpringOut 0.24s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .create-close-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 0.2s ease,
                      color 0.2s ease,
                      box-shadow 0.2s ease,
                      border-color 0.2s ease !important;
        }
        .create-close-btn:hover {
          transform: rotate(90deg) scale(1.08) !important;
          background-color: rgba(239, 68, 68, 0.12) !important;
          color: #EF4444 !important;
          border-color: rgba(239, 68, 68, 0.35) !important;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.22) !important;
        }
        .create-close-btn:active {
          transform: rotate(90deg) scale(0.92) !important;
        }

        .create-btn-primary {
          background: var(--ig-btn-gradient);
          color: #FFFFFF !important;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.22s ease,
                      filter 0.2s ease !important;
        }
        .create-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 8px 24px rgba(244, 63, 94, 0.45) !important;
          filter: brightness(1.05);
        }
        .create-btn-primary:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.98) !important;
        }

        .create-btn-cancel {
          transition: all 0.2s ease !important;
        }
        .create-btn-cancel:hover:not(:disabled) {
          transform: translateY(-1.5px) !important;
          background-color: var(--btn-secondary-hover) !important;
          border-color: var(--border-hover) !important;
        }

        .create-modal-input,
        .create-modal-textarea {
          width: 100%;
          border-radius: 12px;
          border: 1px solid var(--border);
          background-color: ${isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(248, 250, 252, 0.95)'};
          color: var(--fg-main);
          font-family: var(--font-sans);
          font-size: 0.93rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .create-modal-input:focus,
        .create-modal-textarea:focus {
          border-color: var(--brand-coral, #FF5A36);
          box-shadow: 0 0 0 3px rgba(255, 90, 54, 0.16);
          background-color: ${isDark ? 'rgba(15, 23, 42, 0.9)' : '#FFFFFF'};
        }
        .create-modal-input::placeholder,
        .create-modal-textarea::placeholder {
          color: var(--fg-subtle);
          font-size: 0.9rem;
        }

        .create-modal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .create-modal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .create-modal-scroll::-webkit-scrollbar-thumb {
          background: ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'};
          border-radius: 6px;
        }
        .create-modal-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.22)'};
        }

        @media (max-width: 640px) {
          .create-modal-actions-wrap {
            flex-direction: column-reverse;
            gap: 0.75rem;
          }
          .create-modal-actions-left,
          .create-modal-actions-right {
            width: 100%;
            justifyContent: space-between;
          }
          .create-modal-actions-right button {
            flex: 1;
          }
        }
      `}</style>

      <div
        style={{
          ...styles.modalCard,
          background: isDark
            ? 'linear-gradient(160deg, #18181B 0%, #0F0F12 100%)'
            : 'linear-gradient(160deg, #FFFFFF 0%, #FAFAFA 100%)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 25px 65px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)'
            : '0 25px 65px -15px rgba(99, 102, 241, 0.22), 0 10px 30px rgba(0, 0, 0, 0.08)',
        }}
        className={`create-modal-card ${animateOut ? 'out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            ...styles.modalHeader,
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
            background: isDark ? 'rgba(24, 24, 27, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="story-avatar-wrap" style={{ width: '42px', height: '42px', padding: '2px' }}>
              <div className="story-avatar-inner" style={{ borderRadius: '50%', overflow: 'hidden' }}>
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
              <h3
                id="create-modal-title"
                style={{
                  fontSize: '1.18rem',
                  fontWeight: 700,
                  color: 'var(--heading-color)',
                  fontFamily: 'var(--font-outfit)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {t.post.createPostTitle}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', display: 'block', marginTop: '2px' }}>
                {t.post.publishingAs} <strong style={{ color: 'var(--fg-main)', fontWeight: 600 }}>@{username}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            className="create-close-btn"
            onClick={handleClose}
            aria-label={t.common.close}
            title={`${t.common.close} (Esc)`}
            style={styles.closeBtn}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} style={styles.modalFormWrapper}>
          <div className="create-modal-scroll" style={styles.modalScrollArea}>
            {error && (
              <div style={styles.errorBanner} role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Post Title Input */}
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                {t.post.postTitleLabel} <span style={{ color: 'var(--brand-coral)' }}>*</span>
              </label>
              <input
                type="text"
                className="create-modal-input"
                style={{ padding: '0.85rem 1.1rem' }}
                placeholder={t.post.postTitlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Post Content Textarea */}
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                {t.post.contentLabel} <span style={{ color: 'var(--brand-coral)' }}>*</span>
              </label>
              <textarea
                className="create-modal-textarea"
                style={{ padding: '0.85rem 1.1rem', minHeight: '120px', resize: 'vertical', lineHeight: 1.55 }}
                placeholder={t.post.contentPlaceholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                required
              />
            </div>

            {/* Attached Multi-Image Previews (Up to 10 images) */}
            {attachedMediaList.length > 0 && (
              <div
                style={{
                  ...styles.multiPreviewContainer,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                }}
              >
                <div style={styles.multiPreviewHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--brand-coral)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span style={styles.multiPreviewTitle}>
                      Foto Terlampir ({attachedMediaList.length}/10)
                    </span>
                  </div>
                  <span style={styles.multiPreviewSubtitle}>
                    Foto 1 jadi sampul • Tahan & geser untuk atur urutan
                  </span>
                </div>

                <div style={styles.multiPreviewGrid}>
                  {attachedMediaList.map((media, idx) => {
                    const url = uploadService.getImageUrl(media.filePath);
                    const isBeingDragged = draggedIdx === idx;
                    const isDragTarget = dragOverIdx === idx && draggedIdx !== idx;

                    return (
                      <div
                        key={media.filePath ? `${media.filePath}-${media.uploadId ?? idx}` : idx}
                        style={{
                          ...styles.multiPreviewItem,
                          opacity: isBeingDragged ? 0.4 : 1,
                          transform: isDragTarget ? 'scale(1.05)' : isBeingDragged ? 'scale(0.95)' : 'none',
                          borderColor: isDragTarget
                            ? 'var(--social-blue, #0095F6)'
                            : isBeingDragged
                            ? 'var(--social-blue, #0095F6)'
                            : 'var(--border)',
                          boxShadow: isDragTarget
                            ? '0 0 12px rgba(0, 149, 246, 0.45)'
                            : 'none',
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={(e) => handleDragLeave(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        title={`Foto ${idx + 1} - Drag untuk atur urutan`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url || ''}
                          alt={`Foto ${idx + 1}`}
                          style={styles.multiPreviewImg}
                          draggable={false}
                        />

                        {/* Drag Handle Button on Top-Left */}
                        <div
                          style={styles.dragHandleBtn}
                          title="Tahan dan geser (drag) untuk memindahkan urutan"
                          aria-label="Tahan dan geser untuk memindahkan urutan"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="8" cy="5" r="2" />
                            <circle cx="16" cy="5" r="2" />
                            <circle cx="8" cy="12" r="2" />
                            <circle cx="16" cy="12" r="2" />
                            <circle cx="8" cy="19" r="2" />
                            <circle cx="16" cy="19" r="2" />
                          </svg>
                        </div>

                        {/* Remove Button on Top-Right */}
                        <button
                          type="button"
                          style={styles.removeImageBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMedia(idx);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title={`Hapus foto ${idx + 1}`}
                          aria-label={`Hapus foto ${idx + 1}`}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>

                        {/* Order / Cover Badge on Bottom-Left */}
                        {idx === 0 ? (
                          <span style={styles.coverBadge}>Sampul</span>
                        ) : (
                          <span style={styles.orderBadge}>{idx + 1}</span>
                        )}
                      </div>
                    );
                  })}
                  {attachedMediaList.length < 10 && (
                    <button
                      type="button"
                      style={styles.addMoreBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage || loading}
                      title="Tambah foto lagi (maksimal 10)"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span style={{ fontSize: '0.74rem', marginTop: '4px', fontWeight: 600 }}>Tambah</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Media Gallery Panel (GET /upload/my-media) */}
            {showMediaGallery && (
              <div
                style={{
                  ...styles.galleryContainer,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                }}
              >
                <div style={styles.galleryHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--social-blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span style={styles.galleryTitle}>
                      Pilih dari Galeri ({attachedMediaList.length}/10 Foto Terpilih)
                    </span>
                  </div>
                  <button
                    type="button"
                    style={styles.galleryCloseBtn}
                    onClick={() => setShowMediaGallery(false)}
                    aria-label="Tutup panel galeri"
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
                    <p style={{ fontSize: '0.84rem', color: 'var(--fg-subtle)', margin: 0 }}>
                      Belum ada media yang pernah Anda unggah.
                    </p>
                  </div>
                ) : (
                  <div style={styles.galleryGrid}>
                    {mediaList.map((media) => {
                      const thumbUrl = uploadService.getImageUrl(media.file_path);
                      const isSelected = attachedMediaList.some((m) => m.filePath === media.file_path);
                      return (
                        <button
                          key={media.id || media.file_path}
                          type="button"
                          onClick={() => handleSelectFromGallery(media.file_path, media.id)}
                          style={{
                            ...styles.galleryItem,
                            borderColor: isSelected ? 'var(--social-blue)' : 'transparent',
                            boxShadow: isSelected ? '0 0 0 2px var(--social-blue)' : 'none',
                          }}
                          title={media.file_name || 'Media'}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={thumbUrl || ''}
                            alt={media.file_name || 'Upload'}
                            style={styles.galleryImg}
                          />
                          {isSelected && (
                            <div style={styles.gallerySelectedCheck}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div
            className="create-modal-actions-wrap"
            style={{
              ...styles.modalActions,
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
              background: isDark ? 'rgba(18, 18, 22, 0.95)' : 'rgba(250, 250, 250, 0.95)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />

            <div className="create-modal-actions-left" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.84rem',
                  padding: '0.5rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || loading || attachedMediaList.length >= 10}
                title="Unggah Foto (hingga 10 foto)"
              >
                {uploadingImage ? (
                  <>
                    <span className="spinner" style={{ width: '13px', height: '13px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                    <span style={{ fontSize: '0.82rem' }}>{uploadProgressText || t.profile.uploading}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                      <circle cx="12" cy="13" r="4"></circle>
                    </svg>
                    <span>Foto ({attachedMediaList.length}/10)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{
                  fontSize: '0.84rem',
                  padding: '0.5rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  backgroundColor: showMediaGallery ? 'rgba(0, 149, 246, 0.14)' : undefined,
                  color: showMediaGallery ? 'var(--social-blue)' : undefined,
                  borderColor: showMediaGallery ? 'rgba(0, 149, 246, 0.4)' : undefined,
                }}
                onClick={handleToggleGallery}
                disabled={loading}
                title="Pilih dari Galeri Unggahan"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Galeri</span>
              </button>
            </div>

            <div className="create-modal-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn btn-secondary create-btn-cancel"
                style={{ borderRadius: '10px', fontSize: '0.88rem', padding: '0.5rem 1.15rem' }}
                onClick={handleClose}
                disabled={loading}
              >
                {t.common.cancel}
              </button>

              <button
                type="submit"
                className="btn create-btn-primary"
                style={{
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  padding: '0.5rem 1.35rem',
                  opacity: loading || uploadingImage || !title.trim() || !content.trim() ? 0.6 : 1,
                  cursor: loading || uploadingImage || !title.trim() || !content.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
                disabled={loading || uploadingImage || !title.trim() || !content.trim()}
              >
                {loading ? (
                  <>
                    <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                    <span>{t.post.publishing}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    <span>{t.post.publishStory}</span>
                  </>
                )}
              </button>
            </div>
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
    padding: '1rem',
    overflowY: 'auto',
  },
  modalCard: {
    width: '100%',
    maxWidth: '580px',
    borderRadius: '24px',
    position: 'relative',
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.2rem 1.6rem',
    flexShrink: 0,
  },
  avatarLetter: {
    fontSize: '0.86rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    background: 'var(--btn-secondary-bg)',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--btn-secondary-bg, rgba(255, 255, 255, 0.08))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  modalFormWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
  },
  modalScrollArea: {
    padding: '1.4rem 1.6rem',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#EF4444',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '0.88rem',
    border: '1px solid rgba(239, 68, 68, 0.28)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  inputLabel: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--fg-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    fontFamily: 'var(--font-outfit)',
  },
  multiPreviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '0.9rem',
  },
  multiPreviewHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  multiPreviewTitle: {
    fontSize: '0.84rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit)',
  },
  multiPreviewSubtitle: {
    fontSize: '0.74rem',
    color: 'var(--fg-muted)',
  },
  multiPreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
    gap: '0.65rem',
    maxHeight: '220px',
    overflowY: 'auto',
    paddingRight: '2px',
  },
  multiPreviewItem: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg-card)',
    cursor: 'grab',
    userSelect: 'none',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, border-color 0.18s ease',
  },
  dragHandleBtn: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    background: 'rgba(0, 0, 0, 0.72)',
    color: '#fff',
    borderRadius: '4px',
    width: '20px',
    height: '20px',
    cursor: 'grab',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    transition: 'background-color 0.15s ease',
  },
  multiPreviewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  coverBadge: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    background: 'var(--ig-btn-gradient, #FF5A36)',
    color: '#fff',
    fontSize: '0.64rem',
    fontWeight: 800,
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    boxShadow: '0 2px 5px rgba(0,0,0,0.35)',
    pointerEvents: 'none',
  },
  orderBadge: {
    position: 'absolute',
    bottom: '4px',
    left: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    color: '#fff',
    fontSize: '0.68rem',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '4px',
    pointerEvents: 'none',
  },
  addMoreBtn: {
    aspectRatio: '1 / 1',
    borderRadius: '10px',
    border: '1.5px dashed var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--fg-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease',
  },
  removeImageBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    background: 'rgba(0, 0, 0, 0.72)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    zIndex: 2,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    transition: 'background-color 0.15s ease, transform 0.1s ease',
  },
  galleryContainer: {
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '0.9rem',
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
    fontSize: '0.84rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit)',
  },
  galleryCloseBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    fontSize: '1.3rem',
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
    gap: '0.55rem',
    maxHeight: '190px',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  galleryItem: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '2px solid transparent',
    padding: 0,
    cursor: 'pointer',
    background: 'var(--bg-card)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  galleryImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  gallerySelectedCheck: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: 'var(--social-blue, #0095F6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.6rem',
    flexShrink: 0,
  },
};
