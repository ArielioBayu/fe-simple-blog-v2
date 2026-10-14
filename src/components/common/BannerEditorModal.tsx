"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/context';
import { BANNER_PRESETS, getBannerBackground, DEFAULT_BANNER_GRADIENT } from '@/lib/bannerPresets';
import { uploadService } from '@/services/upload.service';

interface BannerEditorModalProps {
  isOpen: boolean;
  currentBannerUrl?: string;
  onClose: () => void;
  onSave: (newBannerUrl: string) => Promise<void>;
}

export function BannerEditorModal({
  isOpen,
  currentBannerUrl,
  onClose,
  onSave,
}: BannerEditorModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Mode: 'preset' or 'custom'
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>(
    currentBannerUrl && !currentBannerUrl.startsWith('preset:') ? 'custom' : 'preset'
  );

  const [selectedPreset, setSelectedPreset] = useState<string>(
    currentBannerUrl?.startsWith('preset:') ? currentBannerUrl : 'preset:sunset-coral'
  );

  // Custom photo upload & crop states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{ width: number; height: number }>({ width: 574, height: 191 });
  const [imageLoading, setImageLoading] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [animateOut, setAnimateOut] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  // Track natural image dimensions when imageSrc changes
  useEffect(() => {
    if (!imageSrc) {
      setImageDimensions(null);
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoading(false);
      setPan({ x: 0, y: 0 });
    };
    img.onerror = () => {
      setImageLoading(false);
      setError('Gagal memuat gambar');
    };
  }, [imageSrc]);

  // Track preview box container size using ResizeObserver
  useEffect(() => {
    if (!previewBoxRef.current) return;
    const updateSize = () => {
      if (previewBoxRef.current) {
        const rect = previewBoxRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPreviewDimensions({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(previewBoxRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Strict boundary clamping so the photo never leaves any empty gap or exposes the container background
  const clampPan = useCallback(
    (targetPan: { x: number; y: number }, targetZoom: number = zoom) => {
      if (!imageDimensions || previewDimensions.width <= 0 || previewDimensions.height <= 0) {
        return targetPan;
      }

      const scale = Math.max(
        previewDimensions.width / imageDimensions.width,
        previewDimensions.height / imageDimensions.height
      );
      const renderedW = imageDimensions.width * scale * targetZoom;
      const renderedH = imageDimensions.height * scale * targetZoom;

      const maxPanX = Math.max(0, (renderedW - previewDimensions.width) / 2);
      const maxPanY = Math.max(0, (renderedH - previewDimensions.height) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, targetPan.x)),
        y: Math.min(maxPanY, Math.max(-maxPanY, targetPan.y)),
      };
    },
    [imageDimensions, previewDimensions, zoom]
  );

  // Initialize states when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentBannerUrl && !currentBannerUrl.startsWith('preset:')) {
        setActiveTab('custom');
        const resolved = uploadService.getImageUrl(currentBannerUrl);
        setImageSrc(resolved || null);
      } else {
        setActiveTab('preset');
        setSelectedPreset(currentBannerUrl || 'preset:sunset-coral');
        setImageSrc(null);
      }
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setError('');
    }
  }, [isOpen, currentBannerUrl]);

  const handleClose = useCallback(() => {
    if (saving) return;
    setAnimateOut(true);
    setTimeout(() => {
      setAnimateOut(false);
      onClose();
    }, 260);
  }, [saving, onClose]);

  // Lock scroll & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, saving, handleClose]);

  if ((!isOpen && !animateOut) || !mounted) return null;

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file foto maksimal 5MB');
      return;
    }

    setError('');
    const objectUrl = URL.createObjectURL(file);
    setImageSrc(objectUrl);
    setActiveTab('custom');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Drag to pan image with boundary protection
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    setPan(clampPan({ x: rawX, y: rawY }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setPan((prev) => clampPan(prev));
  };

  // Touch support for mobile dragging with boundary protection
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rawX = touch.clientX - dragStart.x;
    const rawY = touch.clientY - dragStart.y;
    setPan(clampPan({ x: rawX, y: rawY }));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setPan((prev) => clampPan(prev));
  };

  // Handle zoom change with auto-clamping
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    setPan((prev) => clampPan(prev, newZoom));
  };

  // Render cropped image to Canvas and upload
  const cropAndUploadImage = async (): Promise<string> => {
    if (!imageElementRef.current || !previewBoxRef.current) {
      throw new Error('Preview area tidak siap');
    }

    const img = imageElementRef.current;
    const box = previewBoxRef.current;

    const canvas = document.createElement('canvas');
    // High-resolution 3:1 banner canvas (1200 x 400 px)
    const TARGET_WIDTH = 1200;
    const TARGET_HEIGHT = 400;
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Gagal memproses kanvas gambar');

    const boxRect = box.getBoundingClientRect();
    const scaleFactor = TARGET_WIDTH / boxRect.width;

    // Draw background
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // Calculate image position and scaling
    const imgNaturalW = img.naturalWidth;
    const imgNaturalH = img.naturalHeight;

    // Compute base contain/cover scale relative to preview box
    const baseScale = Math.max(boxRect.width / imgNaturalW, boxRect.height / imgNaturalH);
    const finalScale = baseScale * zoom * scaleFactor;

    const drawnWidth = imgNaturalW * finalScale;
    const drawnHeight = imgNaturalH * finalScale;

    // Centered base offset + strictly clamped pan offset so export is 100% full-coverage
    const clamped = clampPan(pan, zoom);
    const centerX = (TARGET_WIDTH - drawnWidth) / 2 + clamped.x * scaleFactor;
    const centerY = (TARGET_HEIGHT - drawnHeight) / 2 + clamped.y * scaleFactor;

    ctx.drawImage(img, centerX, centerY, drawnWidth, drawnHeight);

    // Convert to Blob and upload
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Gagal mengompres gambar'));
            return;
          }
          try {
            const file = new File([blob], `banner-${Date.now()}.webp`, { type: 'image/webp' });
            const res = await uploadService.uploadImage(file);
            if (res.data?.file_path) {
              resolve(res.data.file_path);
            } else {
              reject(new Error('Gagal mengunggah foto banner'));
            }
          } catch (err) {
            reject(err);
          }
        },
        'image/webp',
        0.92
      );
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      if (activeTab === 'preset') {
        await onSave(selectedPreset);
      } else {
        if (!imageSrc) {
          setError('Silakan pilih foto kustom terlebih dahulu atau gunakan template');
          setSaving(false);
          return;
        }

        // Check if image is an already-uploaded URL with no modifications
        if (
          currentBannerUrl &&
          !currentBannerUrl.startsWith('preset:') &&
          zoom === 1 &&
          pan.x === 0 &&
          pan.y === 0 &&
          imageSrc.includes(currentBannerUrl)
        ) {
          await onSave(currentBannerUrl);
        } else {
          // Crop on Canvas and upload as new optimized banner
          const newFilePath = await cropAndUploadImage();
          await onSave(newFilePath);
        }
      }

      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan banner');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    setSaving(true);
    setError('');
    try {
      setImageSrc(null);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      await onSave('');
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mereset banner');
    } finally {
      setSaving(false);
    }
  };

  // Compute live preview background
  let previewBg = DEFAULT_BANNER_GRADIENT;
  if (activeTab === 'preset') {
    previewBg = getBannerBackground(selectedPreset);
  }

  // Calculate scaled dimensions of image to ensure 100% full cover without gaps
  const baseScale =
    imageDimensions && previewDimensions.width > 0 && previewDimensions.height > 0
      ? Math.max(previewDimensions.width / imageDimensions.width, previewDimensions.height / imageDimensions.height)
      : 1;

  const currentRenderedW = imageDimensions ? imageDimensions.width * baseScale * zoom : previewDimensions.width;
  const currentRenderedH = imageDimensions ? imageDimensions.height * baseScale * zoom : previewDimensions.height;

  // Strict numerical safety guards to prevent React DOM host update errors
  const safeWidth = Number.isFinite(currentRenderedW) && currentRenderedW > 0 ? Math.round(currentRenderedW) : (previewDimensions.width || 574);
  const safeHeight = Number.isFinite(currentRenderedH) && currentRenderedH > 0 ? Math.round(currentRenderedH) : (previewDimensions.height || 191);
  const safePanX = Number.isFinite(pan.x) ? Math.round(pan.x) : 0;
  const safePanY = Number.isFinite(pan.y) ? Math.round(pan.y) : 0;

  const modalNode = (
    <div
      style={styles.modalOverlay}
      className={`banner-modal-backdrop ${animateOut ? 'out' : ''}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="banner-editor-title"
    >
      <style>{`
        @keyframes bannerModalFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes bannerModalFadeOut {
          from { opacity: 1; backdrop-filter: blur(12px); }
          to { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes bannerModalSpringIn {
          0% { opacity: 0; transform: translateY(28px) scale(0.95); }
          65% { opacity: 1; transform: translateY(-4px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bannerModalSpringOut {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(20px) scale(0.95); }
        }

        .banner-modal-backdrop {
          animation: bannerModalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .banner-modal-backdrop.out {
          animation: bannerModalFadeOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .banner-modal-card {
          animation: bannerModalSpringIn 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .banner-modal-card.out {
          animation: bannerModalSpringOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .banner-preset-card {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .banner-preset-card:hover {
          transform: translateY(-2.5px) scale(1.02);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
        }
        .banner-preset-card:active {
          transform: translateY(0) scale(0.98);
        }

        .banner-zoom-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 9999px;
          background: ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)'};
          outline: none;
        }
        .banner-zoom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--brand-coral, #FF5A36);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(255, 90, 54, 0.4);
          transition: transform 0.15s ease;
        }
        .banner-zoom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
      `}</style>

      <div
        className={`banner-modal-card ${animateOut ? 'out' : ''}`}
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h3 id="banner-editor-title" style={styles.modalTitle}>
              Kustomisasi Sampul Profil
            </h3>
            <span style={styles.modalSubtitle}>
              Pilih tema warna Discord atau unggah foto kustom dengan pengaturan posisi & zoom
            </span>
          </div>

          <button
            type="button"
            style={styles.closeBtn}
            onClick={handleClose}
            aria-label="Tutup modal"
            title="Tutup (Esc)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert} role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Live Banner Preview Box */}
        <div style={styles.previewSection}>
          <div style={styles.previewHeaderRow}>
            <span style={styles.sectionLabel}>Pratinjau Sampul Profil</span>
            {activeTab === 'custom' && imageSrc && (
              <span style={styles.dragHint}>
                👆 Geser foto untuk atur posisi • Gunakan slider untuk zoom
              </span>
            )}
          </div>

          <div
            ref={previewBoxRef}
            style={{
              ...styles.previewBox,
              background: activeTab === 'preset' ? previewBg : (imageSrc ? '#0F172A' : DEFAULT_BANNER_GRADIENT),
              cursor: activeTab === 'custom' && imageSrc ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageLoading && (
              <div
                className="skeleton-shimmer"
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 2,
                }}
              />
            )}

            {activeTab === 'custom' && imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageElementRef}
                src={imageSrc}
                crossOrigin="anonymous"
                alt="Pratinjau Sampul"
                style={{
                  ...styles.previewImg,
                  width: `${safeWidth}px`,
                  height: `${safeHeight}px`,
                  transform: `translate(-50%, -50%) translate(${safePanX}px, ${safePanY}px)`,
                  transition: isDragging
                    ? 'none'
                    : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), width 0.15s ease, height 0.15s ease',
                }}
                draggable={false}
              />
            ) : null}

            {/* Grid overlay guideline when in custom dragging mode */}
            {activeTab === 'custom' && imageSrc && (
              <div style={styles.gridOverlay}>
                <div style={{ position: 'absolute', top: '33%', left: 0, right: 0, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
                <div style={{ position: 'absolute', top: '66%', left: 0, right: 0, height: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
                <div style={{ position: 'absolute', left: '33%', top: 0, bottom: 0, width: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
                <div style={{ position: 'absolute', left: '66%', top: 0, bottom: 0, width: '1px', background: 'rgba(255, 255, 255, 0.12)' }} />
              </div>
            )}
          </div>

          {/* Zoom Slider Controls (Active when custom image is present) */}
          {activeTab === 'custom' && imageSrc && (
            <div style={styles.sliderControlRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '70px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-muted)' }}>Zoom:</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="banner-zoom-slider"
                aria-label="Atur zoom foto"
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', minWidth: '40px', textAlign: 'right' }}>
                {zoom.toFixed(1)}x
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', borderRadius: '8px', height: '32px' }}
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                title="Kembalikan posisi & zoom ke default"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div style={styles.tabsContainer}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'preset' ? 'var(--brand-coral)' : 'transparent',
              color: activeTab === 'preset' ? 'var(--heading-color)' : 'var(--fg-muted)',
              fontWeight: activeTab === 'preset' ? 700 : 500,
            }}
            onClick={() => setActiveTab('preset')}
          >
            🎨 Template Warna (Discord)
          </button>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'custom' ? 'var(--brand-coral)' : 'transparent',
              color: activeTab === 'custom' ? 'var(--heading-color)' : 'var(--fg-muted)',
              fontWeight: activeTab === 'custom' ? 700 : 500,
            }}
            onClick={() => {
              setActiveTab('custom');
              if (!imageSrc) {
                fileInputRef.current?.click();
              }
            }}
          >
            📷 Upload Foto Kustom
          </button>
        </div>

        {/* Body based on Tab */}
        <div style={styles.scrollArea}>
          {activeTab === 'preset' ? (
            <div style={styles.presetGrid}>
              {BANNER_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className="banner-preset-card"
                    style={{
                      ...styles.presetCard,
                      background: preset.gradient,
                      borderColor: isSelected ? 'var(--social-blue, #0095F6)' : 'transparent',
                      boxShadow: isSelected ? '0 0 0 3px var(--social-blue, #0095F6), 0 8px 24px rgba(0, 0, 0, 0.35)' : 'none',
                    }}
                    onClick={() => setSelectedPreset(preset.id)}
                    title={`Pilih ${preset.name}`}
                  >
                    <div style={styles.presetCardOverlay}>
                      <span style={styles.presetCardName}>{preset.name}</span>
                      <span style={styles.presetCardTag}>{preset.tag}</span>
                    </div>

                    {isSelected && (
                      <div style={styles.selectedBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={styles.customUploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div style={styles.uploadPromptBox}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--brand-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>

                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--heading-color)' }}>
                    {imageSrc ? 'Ganti Foto Sampul' : 'Pilih Foto dari Perangkat'}
                  </p>
                  <span style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)' }}>
                    Format PNG, JPG, atau WebP (maksimal 5MB)
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ borderRadius: '10px', fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>{imageSrc ? 'Pilih Foto Lain' : 'Pilih Foto'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={styles.modalFooter}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ ...styles.footerBtn, color: '#EF4444', marginRight: 'auto' }}
            onClick={handleResetToDefault}
            disabled={saving}
            title="Reset ke gradasi bawaan aplikasi"
          >
            Hapus Sampul
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={styles.footerBtn}
            onClick={handleClose}
            disabled={saving}
          >
            Batal
          </button>

          <button
            type="button"
            className="btn btn-primary"
            style={{
              ...styles.footerBtn,
              background: 'var(--ig-btn-gradient)',
              color: '#fff',
              minWidth: '130px',
            }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                <span>Menyimpan...</span>
              </>
            ) : (
              'Terapkan Sampul'
            )}
          </button>
        </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    padding: '1rem',
    overflowY: 'auto',
  },
  modalCard: {
    width: '100%',
    maxWidth: '640px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92vh',
    overflow: 'hidden',
    position: 'relative',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.4rem 1.6rem 1rem',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  modalTitle: {
    fontFamily: 'var(--font-outfit)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--fg-muted)',
    marginTop: '3px',
    display: 'block',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    color: 'var(--fg-muted)',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
  },
  errorAlert: {
    margin: '0.75rem 1.6rem 0',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: '#EF4444',
    padding: '0.65rem 0.9rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  previewSection: {
    padding: '1.2rem 1.6rem 0.5rem',
    flexShrink: 0,
  },
  previewHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.6rem',
    flexWrap: 'wrap',
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '0.82rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--fg-muted)',
    fontFamily: 'var(--font-outfit)',
  },
  dragHint: {
    fontSize: '0.74rem',
    color: 'var(--brand-coral)',
    fontWeight: 600,
  },
  previewBox: {
    width: '100%',
    aspectRatio: '3 / 1',
    maxHeight: '185px',
    borderRadius: '14px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
    userSelect: 'none',
  },
  previewImg: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    maxWidth: 'none',
    maxHeight: 'none',
    pointerEvents: 'none',
    userSelect: 'none',
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    border: '1px dashed rgba(255, 255, 255, 0.3)',
    borderRadius: '14px',
  },
  sliderControlRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '10px',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    padding: '0 1.6rem',
    marginTop: '0.5rem',
    flexShrink: 0,
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    fontSize: '0.88rem',
    transition: 'all 0.2s ease',
  },
  scrollArea: {
    padding: '1.2rem 1.6rem',
    overflowY: 'auto',
    flex: 1,
    maxHeight: '230px',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '0.75rem',
  },
  presetCard: {
    aspectRatio: '16 / 9',
    borderRadius: '10px',
    border: '2px solid transparent',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    padding: 0,
    display: 'flex',
    alignItems: 'flex-end',
  },
  presetCardOverlay: {
    width: '100%',
    background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.75) 100%)',
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  presetCardName: {
    color: '#fff',
    fontSize: '0.74rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  presetCardTag: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.64rem',
    fontWeight: 500,
  },
  selectedBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'var(--social-blue, #0095F6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  customUploadSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem 0',
  },
  uploadPromptBox: {
    width: '100%',
    padding: '1.5rem',
    borderRadius: '14px',
    border: '1.5px dashed var(--border)',
    backgroundColor: 'var(--btn-secondary-bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.85rem',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1.1rem 1.6rem',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  footerBtn: {
    borderRadius: '10px',
    fontSize: '0.88rem',
    padding: '0.55rem 1.15rem',
    fontWeight: 600,
  },
};
