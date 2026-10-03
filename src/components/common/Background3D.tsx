"use client";

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/context';

interface StardustParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  baseAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
}

/**
 * Background3D / Micro-Stardust — Elegant Minimalist Interactive Ambient Background
 *
 * Replaces heavy 3D geometric shapes with delicate, floating micro-stardust particles (1–2px).
 * Drifts gently upward with subtle sine-wave sway, softly responds to mouse proximity,
 * and harmoniously transitions between Light and Dark mode.
 */
export function Background3D() {
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

    // Brand color palette (RGB arrays for dynamic alpha rendering)
    const brandColorsDark = [
      'rgba(255, 90, 54,',   // Coral
      'rgba(225, 48, 108,',  // Pink
      'rgba(0, 149, 246,',   // Blue
      'rgba(131, 58, 180,',  // Violet
      'rgba(240, 148, 51,',  // Amber
      'rgba(6, 182, 212,',   // Cyan
    ];

    const brandColorsLight = [
      'rgba(255, 110, 80,',  // Soft Coral
      'rgba(236, 72, 153,',  // Soft Pink
      'rgba(56, 189, 248,',  // Sky Blue
      'rgba(167, 139, 250,', // Soft Lavender
      'rgba(251, 146, 60,',  // Soft Peach
    ];

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // ── Create Micro-Stardust Particles ──────────────────────────────────────
    const particleCount = Math.floor(Math.min(width * 0.065, 80));
    const particles: StardustParticle[] = [];

    const isDarkInitial = themeRef.current === 'dark';
    const activePalette = isDarkInitial ? brandColorsDark : brandColorsLight;

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const baseAlpha = isDarkInitial
        ? 0.25 + Math.random() * 0.45
        : 0.18 + Math.random() * 0.32;

      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.45), // Slow gentle upward drift
        size: 1.0 + Math.random() * 1.5,     // Ultra-delicate micro size (0.9px - 2.4px)
        color: activePalette[Math.floor(Math.random() * activePalette.length)],
        alpha: baseAlpha,
        baseAlpha,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
      });
    }

    // ── Mouse Tracking (Soft Proximity Repulsion) ─────────────────────────────
    let mouseX = -9999;
    let mouseY = -9999;
    let targetMouseX = -9999;
    let targetMouseY = -9999;

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const handleMouseLeave = () => {
      targetMouseX = -9999;
      targetMouseY = -9999;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // ── Resize Handler ───────────────────────────────────────────────────────
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);

    // ── Animation Loop ───────────────────────────────────────────────────────
    let animationFrameId: number;
    let time = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      // Pause when tab is not visible to consume 0% resources
      if (document.hidden) return;

      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse coordinates
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      const isDark = themeRef.current === 'dark';
      const palette = isDark ? brandColorsDark : brandColorsLight;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Micro vertical drift with subtle horizontal sine sway
        p.y += p.vy;
        p.x += p.vx + Math.sin(time + p.pulsePhase) * 0.15;

        // Mouse gentle proximity repulsion (smooth evasion)
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 90;

        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 1.8;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }

        // Wrap around screen boundaries seamlessly
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Subtle breathing glow pulsation
        const pulse = Math.sin(time * 2 + p.pulsePhase);
        const currentAlpha = Math.max(
          0.08,
          Math.min(0.85, p.baseAlpha + pulse * 0.15),
        );

        // Render micro particle with soft radial glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${currentAlpha})`;
        ctx.shadowColor = `${p.color} ${currentAlpha * 0.8})`;
        ctx.shadowBlur = isDark ? 6 : 3;
        ctx.fill();

        // Periodically sync palette with theme
        if (i % 15 === 0) {
          p.color = palette[i % palette.length];
        }
      }

      // Reset shadow blur
      ctx.shadowBlur = 0;
    };

    render();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    />
  );
}
