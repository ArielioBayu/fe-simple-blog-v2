"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { uploadService } from '@/services';
import { PostMedia } from '@/types';

export interface ImageCarouselItem {
  file_path: string;
  id?: number;
  upload_id?: number;
}

interface ImageCarouselProps {
  media: (PostMedia | ImageCarouselItem | string)[];
  altText?: string;
  aspectRatio?: string;
  maxHeight?: string;
  onImageClick?: (index: number) => void;
  autoPlayInterval?: number;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain';
}

export function ImageCarousel({
  media,
  altText = 'Post image',
  aspectRatio = '16 / 10',
  maxHeight = '460px',
  onImageClick,
  autoPlayInterval = 4500,
  className = '',
  style,
  objectFit = 'cover',
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const transitionLockRef = useRef(false);

  // Normalize media items to string file paths
  const images = (media || [])
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.file_path || '';
    })
    .filter(Boolean);

  const total = images.length;

  // Navigate with a lock to prevent overlapping transitions
  const navigateTo = useCallback((nextIdx: number) => {
    if (transitionLockRef.current || nextIdx === currentIndex) return;

    transitionLockRef.current = true;
    setIsTransitioning(true);
    setCurrentIndex(nextIdx);

    // Unlock after transition completes (matches CSS transition duration 600ms)
    setTimeout(() => {
      transitionLockRef.current = false;
      setIsTransitioning(false);
    }, 600);
  }, [currentIndex]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    navigateTo(currentIndex > 0 ? currentIndex - 1 : total - 1);
  }, [currentIndex, total, navigateTo]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    navigateTo(currentIndex < total - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, total, navigateTo]);

  // Auto-play — pauses on hover
  useEffect(() => {
    if (total <= 1 || isHovered || isTransitioning) return;

    const timer = setInterval(() => {
      const nextIdx = currentIndex < total - 1 ? currentIndex + 1 : 0;
      navigateTo(nextIdx);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [total, isHovered, isTransitioning, autoPlayInterval, currentIndex, navigateTo]);

  // Touch swipe support
  const minSwipeDistance = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) handleNext();
    else if (distance < -minSwipeDistance) handlePrev();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || document.activeElement !== containerRef.current) return;
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (total === 0) return null;

  // ── Single Image: clean, no chrome ──────────────────────────────────────
  if (total === 1) {
    const src = uploadService.getImageUrl(images[0]) || images[0];
    return (
      <div
        style={{ ...styles.outerWrap, aspectRatio, maxHeight, ...style }}
        className={`image-carousel-wrap ${className}`}
        onClick={() => onImageClick?.(0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={altText} style={{ ...styles.slideImg, objectFit }} loading="lazy" />
      </div>
    );
  }

  // ── Multi-Image: Sliding Strip Carousel ─────────────────────────────────
  // All images sit side-by-side in a long strip.
  // Only the strip's translateX changes — one smooth CSS transition, zero jank.
  const translateX = -(currentIndex * 100);

  return (
    <div
      ref={containerRef}
      style={{ ...styles.outerWrap, aspectRatio, maxHeight, ...style }}
      className={`image-carousel-wrap ${className}`}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={`${altText} (${currentIndex + 1} of ${total})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={() => onImageClick?.(currentIndex)}
    >
      <style>{`
        /* ================================================================
           ImageCarousel — Sliding Strip with Premium Easing
           All slides lay side-by-side; the strip translates as one unit.
           Result: perfectly sync'd, physically accurate, zero jank.
        ================================================================ */

        .carousel-strip {
          display: flex;
          width: 100%;
          height: 100%;
          /* Apple-grade spring easing: fast start, smooth deceleration */
          transition: transform 0.58s cubic-bezier(0.42, 0, 0.12, 1);
          will-change: transform;
        }

        .carousel-slide {
          flex: 0 0 100%;
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .carousel-slide img {
          width: 100%;
          height: 100%;
          object-fit: ${objectFit};
          display: block;
          /* Subtle scale effect on the non-active slides for depth perception */
          transition: transform 0.58s cubic-bezier(0.42, 0, 0.12, 1),
                      filter 0.58s cubic-bezier(0.42, 0, 0.12, 1);
          transform: scale(1.03);
          filter: brightness(0.88);
        }

        .carousel-slide.active img {
          transform: scale(1);
          filter: brightness(1);
        }

        /* ── Nav Buttons ─────────────────────────────────────────────── */
        .ig-carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: none;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 5;
          padding: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.12);
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.22s ease,
                      background-color 0.18s ease;
          opacity: 0;
          outline: none;
        }

        .image-carousel-wrap:hover .ig-carousel-btn {
          opacity: 0.92;
        }

        .ig-carousel-btn:hover {
          opacity: 1 !important;
          background: #ffffff;
          transform: translateY(-50%) scale(1.1);
          box-shadow: 0 6px 16px rgba(0,0,0,0.32);
        }

        .ig-carousel-btn:active {
          transform: translateY(-50%) scale(0.93);
        }

        .ig-carousel-prev { left: 10px; }
        .ig-carousel-next { right: 10px; }

        @media (hover: none) {
          .ig-carousel-btn { opacity: 0.82; }
        }

        /* ── Progress Bar Indicator ─────────────────────────────────── */
        .ig-progress-bar-track {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255,255,255,0.18);
          z-index: 5;
          pointer-events: none;
        }

        .ig-progress-bar-fill {
          height: 100%;
          background: rgba(255,255,255,0.88);
          transition: width 0.58s cubic-bezier(0.42, 0, 0.12, 1);
        }

        /* ── Dot Indicators ─────────────────────────────────────────── */
        .ig-carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .ig-carousel-dot.active {
          width: 18px;
          border-radius: 4px;
          background: #ffffff;
          box-shadow: 0 0 6px rgba(255,255,255,0.85);
        }
      `}</style>

      {/* ── Sliding Strip ─────────────────────────────────────────────── */}
      <div
        className="carousel-strip"
        style={{ transform: `translateX(${translateX}%)` }}
        aria-live="polite"
      >
        {images.map((src, idx) => {
          const imgSrc = uploadService.getImageUrl(src) || src;
          return (
            <div
              key={idx}
              className={`carousel-slide ${idx === currentIndex ? 'active' : ''}`}
              aria-hidden={idx !== currentIndex}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${idx + 1} of ${total}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={`${altText} — Foto ${idx + 1}`}
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}
      </div>

      {/* ── Counter Badge (top-right) ─────────────────────────────────── */}
      <div style={styles.counterBadge}>
        <span>{currentIndex + 1} / {total}</span>
      </div>

      {/* ── Left Nav Arrow ───────────────────────────────────────────── */}
      <button
        type="button"
        className="ig-carousel-btn ig-carousel-prev"
        onClick={handlePrev}
        aria-label="Foto sebelumnya"
        title="Foto sebelumnya"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="#1c1e21" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* ── Right Nav Arrow ──────────────────────────────────────────── */}
      <button
        type="button"
        className="ig-carousel-btn ig-carousel-next"
        onClick={handleNext}
        aria-label="Foto selanjutnya"
        title="Foto selanjutnya"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="#1c1e21" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ── Dot Indicators (bottom) ──────────────────────────────────── */}
      <div style={styles.dotsContainer}>
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`ig-carousel-dot ${idx === currentIndex ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              navigateTo(idx);
            }}
            aria-label={`Buka slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* ── Bottom Progress Bar ──────────────────────────────────────── */}
      <div className="ig-progress-bar-track">
        <div
          className="ig-progress-bar-fill"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  outerWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: 'var(--radius-md, 12px)',
    overflow: 'hidden',
    backgroundColor: '#0c0d12',
    userSelect: 'none',
    outline: 'none',
  },
  slideImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  counterBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'rgba(15, 17, 23, 0.68)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    color: '#ffffff',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    padding: '3px 8px',
    borderRadius: '12px',
    zIndex: 6,
    pointerEvents: 'none',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: '14px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 6,
  },
};
