"use client";

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context';

interface AuroraOrb {
  // Base origin
  baseXRatio: number;
  baseYRatio: number;
  radiusRatio: number;
  colorRgb: string;
  // Dynamic wave parameters
  speedX: number;
  speedY: number;
  amplitudeX: number;
  amplitudeY: number;
  pulseSpeed: number;
  phase: number;
}

/**
 * AmbientAuroraBackground (Option 2)
 *
 * Cinematic fluid ambient aurora wave effect with brand colors (Coral, Pink, Violet, Cyan, Amber).
 * Features smooth organic wave undulation, mouse-following ambient glow, deep frosted blur,
 * and adaptive color luminance for Light and Dark modes.
 */
export function AmbientAuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Responsive scaling
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // ── 5 Brand Aurora Ribbon Orbs ───────────────────────────────────────────
    const orbs: AuroraOrb[] = [
      {
        baseXRatio: 0.22,
        baseYRatio: 0.28,
        radiusRatio: 0.52,
        colorRgb: '255, 90, 54', // Brand Coral
        speedX: 0.016,
        speedY: 0.012,
        amplitudeX: 140,
        amplitudeY: 100,
        pulseSpeed: 0.018,
        phase: 0,
      },
      {
        baseXRatio: 0.78,
        baseYRatio: 0.32,
        radiusRatio: 0.56,
        colorRgb: '236, 72, 153', // Brand Pink
        speedX: 0.013,
        speedY: 0.017,
        amplitudeX: 160,
        amplitudeY: 120,
        pulseSpeed: 0.014,
        phase: Math.PI * 0.5,
      },
      {
        baseXRatio: 0.48,
        baseYRatio: 0.68,
        radiusRatio: 0.54,
        colorRgb: '139, 92, 246', // Royal Violet
        speedX: 0.014,
        speedY: 0.015,
        amplitudeX: 150,
        amplitudeY: 110,
        pulseSpeed: 0.016,
        phase: Math.PI,
      },
      {
        baseXRatio: 0.82,
        baseYRatio: 0.78,
        radiusRatio: 0.48,
        colorRgb: '14, 165, 233', // Ocean Cyan
        speedX: 0.018,
        speedY: 0.014,
        amplitudeX: 130,
        amplitudeY: 90,
        pulseSpeed: 0.02,
        phase: Math.PI * 1.4,
      },
      {
        baseXRatio: 0.18,
        baseYRatio: 0.72,
        radiusRatio: 0.46,
        colorRgb: '245, 158, 11', // Golden Amber
        speedX: 0.012,
        speedY: 0.015,
        amplitudeX: 120,
        amplitudeY: 100,
        pulseSpeed: 0.015,
        phase: Math.PI * 0.75,
      },
    ];

    // ── Mouse Interaction Coordinates ────────────────────────────────────────
    let targetMouseX = width * 0.5;
    let targetMouseY = height * 0.5;
    let currentMouseX = width * 0.5;
    let currentMouseY = height * 0.5;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // ── Window Resize ────────────────────────────────────────────────────────
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    // ── Render Loop ──────────────────────────────────────────────────────────
    let animationFrameId: number;
    let time = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      // 0% CPU consumption when user switches tab
      if (document.hidden) return;

      time += 1;

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.06;
      currentMouseY += (targetMouseY - currentMouseY) * 0.06;

      const isDark = themeRef.current === 'dark';

      // Clear with base atmospheric canvas color
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = isDark ? '#070913' : '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      // In Dark mode, 'screen' makes overlapping lights glow vibrantly
      // In Light mode, 'source-over' produces saturated smooth pastel gradients
      ctx.globalCompositeOperation = isDark ? 'screen' : 'source-over';

      const baseAlpha = isDark ? 0.42 : 0.38;
      const minDim = Math.min(width, height);

      // Draw each fluid undulating aurora orb
      for (let i = 0; i < orbs.length; i++) {
        const orb = orbs[i];

        // Harmonious sine & cosine wave motion
        const waveX = Math.sin(time * orb.speedX + orb.phase) * orb.amplitudeX;
        const waveY = Math.cos(time * orb.speedY + orb.phase) * orb.amplitudeY;
        const waveZ = Math.sin(time * 0.01 + orb.phase * 2) * 40;

        // Base coordinate with responsive ratio
        let cx = width * orb.baseXRatio + waveX;
        let cy = height * orb.baseYRatio + waveY + waveZ;

        // Subtle organic magnetic reaction to mouse position
        const dx = currentMouseX - cx;
        const dy = currentMouseY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 650) {
          const factor = (1 - dist / 650) * 45;
          cx += (dx / dist) * factor;
          cy += (dy / dist) * factor;
        }

        // Breathing radius pulse
        const radiusPulse = 1 + Math.sin(time * orb.pulseSpeed + orb.phase) * 0.14;
        const currentRadius = minDim * orb.radiusRatio * radiusPulse;

        // Multi-stop radial gradient with smooth outer feathering
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);

        grad.addColorStop(0, `rgba(${orb.colorRgb}, ${baseAlpha})`);
        grad.addColorStop(0.35, `rgba(${orb.colorRgb}, ${baseAlpha * 0.72})`);
        grad.addColorStop(0.65, `rgba(${orb.colorRgb}, ${baseAlpha * 0.32})`);
        grad.addColorStop(0.85, `rgba(${orb.colorRgb}, ${baseAlpha * 0.1})`);
        grad.addColorStop(1, `rgba(${orb.colorRgb}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Dynamic Interactive Mouse Ambient Glow ─────────────────────────────
      const mouseRadius = minDim * 0.4;
      const mouseGrad = ctx.createRadialGradient(
        currentMouseX,
        currentMouseY,
        0,
        currentMouseX,
        currentMouseY,
        mouseRadius,
      );

      // Color shifts smoothly between Coral, Cyan, and Pink based on time
      const hueAngle = (time * 0.01) % (Math.PI * 2);
      const isShift = Math.sin(hueAngle) > 0;
      const mouseColor = isDark
        ? (isShift ? '236, 72, 153' : '14, 165, 233') // Pink to Cyan
        : (isShift ? '255, 90, 54' : '139, 92, 246'); // Coral to Violet

      const mouseAlpha = isDark ? 0.35 : 0.28;
      mouseGrad.addColorStop(0, `rgba(${mouseColor}, ${mouseAlpha})`);
      mouseGrad.addColorStop(0.4, `rgba(${mouseColor}, ${mouseAlpha * 0.5})`);
      mouseGrad.addColorStop(0.75, `rgba(${mouseColor}, ${mouseAlpha * 0.15})`);
      mouseGrad.addColorStop(1, `rgba(${mouseColor}, 0)`);

      ctx.fillStyle = mouseGrad;
      ctx.beginPath();
      ctx.arc(currentMouseX, currentMouseY, mouseRadius, 0, Math.PI * 2);
      ctx.fill();
    };

    render();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: -40, // Extend slightly beyond viewport to avoid edge cutoff from blur
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        filter: 'blur(55px)',
        WebkitFilter: 'blur(55px)',
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
