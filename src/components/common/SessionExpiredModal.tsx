"use client";

import React, { useEffect, useState } from 'react';

interface SessionExpiredModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SessionExpiredModal({ visible, onClose }: SessionExpiredModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    if (visible) {
      setAnimateOut(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMounted(true));
      });
    } else {
      setMounted(false);
    }
  }, [visible]);

  // suppress unused warning
  void mounted;

  const handleClose = () => {
    setAnimateOut(true);
    setMounted(false);
    setTimeout(() => {
      onClose();
      setAnimateOut(false);
    }, 380);
  };

  if (!visible && !animateOut) return null;

  const css = `
    @keyframes sem-backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes sem-backdrop-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes sem-modal-in {
      from { opacity: 0; transform: translateY(28px) scale(0.93); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes sem-modal-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(16px) scale(0.95); }
    }
    @keyframes sem-icon-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50% { transform: scale(1.06); box-shadow: 0 0 0 10px rgba(239,68,68,0); }
    }
    .sem-backdrop { animation: sem-backdrop-in 0.3s cubic-bezier(0.4,0,0.2,1) forwards; }
    .sem-backdrop.out { animation: sem-backdrop-out 0.35s cubic-bezier(0.4,0,0.2,1) forwards; }
    .sem-card { animation: sem-modal-in 0.42s cubic-bezier(0.34,1.56,0.64,1) forwards; }
    .sem-card.out { animation: sem-modal-out 0.32s cubic-bezier(0.4,0,0.2,1) forwards; }
    .sem-icon-wrap { animation: sem-icon-pulse 2.4s ease-in-out infinite; }
    .sem-close-btn:hover { background: rgba(239,68,68,0.12) !important; transform: scale(1.08); }
    .sem-action-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(239,68,68,0.4) !important; }
    .sem-action-btn:active { transform: translateY(0); }
  `;

  const backdropClass = `sem-backdrop${animateOut ? ' out' : ''}`;
  const cardClass = `sem-card${animateOut ? ' out' : ''}`;

  return (
    <>
      <style>{css}</style>

      <div
        className={backdropClass}
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          background: 'rgba(0,0,0,0.52)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          className={cardClass}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '400px',
            borderRadius: '20px',
            background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.12) inset',
            overflow: 'hidden',
            padding: '36px 32px 32px',
          }}
        >
          {/* Top accent gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, #ef4444 30%, #f97316 70%, transparent)',
          }} />

          {/* Close button */}
          <button
            className="sem-close-btn"
            onClick={handleClose}
            aria-label="Close session expired modal"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'all 0.2s ease',
              lineHeight: 1,
            }}
          >
            x
          </button>

          {/* Lock Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div
              className="sem-icon-wrap"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)',
                border: '1.5px solid rgba(239,68,68,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="rgba(239,68,68,0.12)" stroke="#ef4444" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>

          {/* Badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 12px',
              borderRadius: '99px',
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'inline-block',
              }} />
              Session Expired
            </span>
          </div>

          {/* Heading */}
          <h2 style={{
            margin: '0 0 10px',
            textAlign: 'center',
            fontSize: '20px',
            fontWeight: 700,
            color: '#f1f5f9',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            Your session has expired
          </h2>

          {/* Body */}
          <p style={{
            margin: '0 0 28px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'rgba(255,255,255,0.48)',
            lineHeight: 1.65,
          }}>
            Please log in to continue. Your account is safe and all your data is intact.
          </p>

          {/* CTA */}
          <button
            className="sem-action-btn"
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 16px rgba(239,68,68,0.25)',
              transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            Log in to continue
          </button>

          {/* Fine print */}
          <p style={{
            margin: '14px 0 0',
            textAlign: 'center',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.25)',
          }}>
          </p>
        </div>
      </div>
    </>
  );
}
