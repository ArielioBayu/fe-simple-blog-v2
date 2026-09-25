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
}

type SlideDirection = 'next' | 'prev' | 'none';

export function ImageCarousel({
  media,
  altText = 'Post image',
  aspectRatio = '16 / 10',
  maxHeight = '460px',
  onImageClick,
  autoPlayInterval = 4500,
  className = '',
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<SlideDirection>('none');
  const [isAnimating, setIsAnimating] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normalize media items to string file paths
  const images = (media || [])
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.file_path || '';
    })
    .filter(Boolean);

  const total = images.length;

  const goTo = useCallback((nextIdx: number, dir: SlideDirection) => {
    if (isAnimating) return;

    setPrevIndex(currentIndex);
    setDirection(dir);
    setCurrentIndex(nextIdx);
    setIsAnimating(true);

    // Clear any existing timer
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);

    // Animation duration: 520ms — matches CSS transition
    animationTimerRef.current = setTimeout(() => {
      setPrevIndex(null);
      setIsAnimating(false);
    }, 520);
  }, [currentIndex, isAnimating]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const nextIdx = currentIndex > 0 ? currentIndex - 1 : total - 1;
    goTo(nextIdx, 'prev');
  }, [currentIndex, total, goTo]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const nextIdx = currentIndex < total - 1 ? currentIndex + 1 : 0;
    goTo(nextIdx, 'next');
  }, [currentIndex, total, goTo]);

  const handleDotClick = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (idx === currentIndex) return;
    const dir: SlideDirection = idx > currentIndex ? 'next' : 'prev';
    goTo(idx, dir);
  }, [currentIndex, goTo]);

  // Auto-swipe with pause on hover/touch
  useEffect(() => {
    if (total <= 1 || isHovered || isInteracting || isAnimating) return;

    const timer = setInterval(() => {
      const nextIdx = currentIndex < total - 1 ? currentIndex + 1 : 0;
      goTo(nextIdx, 'next');
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [total, isHovered, isInteracting, isAnimating, autoPlayInterval, currentIndex, goTo]);

  // Cleanup animation timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, []);

  // Touch Swipe Gesture for mobile
  const minSwipeDistance = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    setIsInteracting(true);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsInteracting(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && total > 1) {
      handleNext();
    } else if (isRightSwipe && total > 1) {
      handlePrev();
    }
  };

  // Keyboard navigation when focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || document.activeElement !== containerRef.current) return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  if (total === 0) return null;

  // Single Image Render (Zero carousel clutter, clean & native)
  if (total === 1) {
    const src = uploadService.getImageUrl(images[0]) || images[0];
    return (
      <div
        style={{
          ...styles.carouselContainer,
          aspectRatio,
          maxHeight,
        }}
        className={`image-carousel-wrap ${className}`}
        onClick={() => onImageClick?.(0)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={altText}
          style={styles.image}
          loading="lazy"
        />
      </div>
    );
  }

  // Multi-Image Carousel (2 to 10 images) with directional slide animation
  const currentSrc = uploadService.getImageUrl(images[currentIndex]) || images[currentIndex];
  const prevSrc = prevIndex !== null
    ? (uploadService.getImageUrl(images[prevIndex]) || images[prevIndex])
    : null;

  // Compute CSS animation class names based on direction
  const enterClass = direction === 'next'
    ? 'slide-enter-from-right'
    : direction === 'prev'
      ? 'slide-enter-from-left'
      : 'slide-enter-fade';

  const exitClass = direction === 'next'
    ? 'slide-exit-to-left'
    : direction === 'prev'
      ? 'slide-exit-to-right'
      : '';

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.carouselContainer,
        aspectRatio,
        maxHeight,
      }}
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
           ImageCarousel — Smooth Directional Slide Animation System
           Using CSS @keyframes with direction tracking for silky UX
        ================================================================ */

        .carousel-slide-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .carousel-slide-layer img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ── Entering animations ─────────────────────────────────────── */
        .slide-enter-from-right {
          animation: slideInFromRight 0.52s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          z-index: 2;
        }
        .slide-enter-from-left {
          animation: slideInFromLeft 0.52s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          z-index: 2;
        }
        .slide-enter-fade {
          animation: slideFadeIn 0.38s ease forwards;
          z-index: 2;
        }

        /* ── Exiting animations ──────────────────────────────────────── */
        .slide-exit-to-left {
          animation: slideOutToLeft 0.52s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          z-index: 1;
        }
        .slide-exit-to-right {
          animation: slideOutToRight 0.52s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          z-index: 1;
        }

        /* ── Keyframe definitions ────────────────────────────────────── */
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0.6;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100%);
            opacity: 0.6;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutToLeft {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(-100%);
            opacity: 0.4;
          }
        }

        @keyframes slideOutToRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0.4;
          }
        }

        @keyframes slideFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* ── Instagram-style Compact Floating Navigation Buttons ─────── */
        .ig-carousel-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          min-width: 28px;
          min-height: 28px;
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
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22), 0 1px 2px rgba(0, 0, 0, 0.12);
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
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.32);
        }

        .ig-carousel-btn:active {
          transform: translateY(-50%) scale(0.92);
        }

        .ig-carousel-prev { left: 10px; }
        .ig-carousel-next { right: 10px; }

        @media (hover: none) {
          .ig-carousel-btn { opacity: 0.85; }
        }

        /* ── Instagram-style Dots ────────────────────────────────────── */
        .ig-carousel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
          transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .ig-carousel-dot.active {
          width: 18px;
          border-radius: 4px;
          background: #ffffff;
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.85);
        }
      `}</style>

      {/* Image Layers Stack — exit layer (prev) sits below enter layer (current) */}

      {/* Exiting Layer (previous slide going away) */}
      {prevSrc && isAnimating && (
        <div className={`carousel-slide-layer ${exitClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={prevSrc}
            alt={`${altText} - Foto ${(prevIndex ?? 0) + 1}`}
            loading="lazy"
          />
        </div>
      )}

      {/* Entering Layer (current slide coming in) */}
      <div className={`carousel-slide-layer ${isAnimating ? enterClass : ''}`} style={{ zIndex: isAnimating ? 2 : 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={`${altText} - Foto ${currentIndex + 1}`}
          loading="lazy"
        />
      </div>

      {/* Slide Badge Pill (Top-Right: "1/3") */}
      <div style={styles.counterBadge}>
        <span>{currentIndex + 1} / {total}</span>
      </div>

      {/* Left Navigation Arrow */}
      <button
        type="button"
        className="ig-carousel-btn ig-carousel-prev"
        onClick={handlePrev}
        aria-label="Foto sebelumnya"
        title="Foto sebelumnya"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1c1e21"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      {/* Right Navigation Arrow */}
      <button
        type="button"
        className="ig-carousel-btn ig-carousel-next"
        onClick={handleNext}
        aria-label="Foto selanjutnya"
        title="Foto selanjutnya"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1c1e21"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Bottom Dots Indicator */}
      <div style={styles.dotsContainer}>
        {images.map((_, idx) => (
          <button
            key={idx}
            type="button"
            className={`ig-carousel-dot ${idx === currentIndex ? 'active' : ''}`}
            onClick={(e) => handleDotClick(idx, e)}
            aria-label={`Buka slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  carouselContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 'var(--radius-md, 12px)',
    overflow: 'hidden',
    backgroundColor: '#0c0d12',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    outline: 'none',
  },
  image: {
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
    bottom: '12px',
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
