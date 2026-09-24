"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/context';

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  title = 'Hapus Postingan?',
  description = 'Apakah Anda yakin ingin menghapus postingan ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.',
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  isDeleting = false,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [animateOut, setAnimateOut] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isDeleting) {
        handleClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isDeleting]);

  if (!isOpen && !animateOut) return null;

  const handleClose = () => {
    if (isDeleting) return;
    setAnimateOut(true);
    setTimeout(() => {
      setAnimateOut(false);
      onClose();
    }, 220);
  };

  const handleConfirm = async () => {
    await onConfirm();
    handleClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <style jsx>{`
        @keyframes deleteBackdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes deleteBackdropFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes deleteModalSpringIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(14px);
          }
          60% {
            transform: scale(1.02) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes deleteModalSpringOut {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
        }
        @keyframes pulseHalo {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.25);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
        }

        .delete-backdrop {
          animation: ${animateOut ? 'deleteBackdropFadeOut 0.22s ease-in forwards' : 'deleteBackdropFadeIn 0.25s ease-out forwards'};
        }
        .delete-card {
          animation: ${animateOut ? 'deleteModalSpringOut 0.22s ease-in forwards' : 'deleteModalSpringIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'};
        }
        .delete-close-btn {
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
            background-color 0.15s ease,
            color 0.15s ease !important;
        }
        .delete-close-btn:hover {
          transform: rotate(90deg) scale(1.1) !important;
          background-color: rgba(239, 68, 68, 0.12) !important;
          color: #ef4444 !important;
        }
        .delete-btn-danger {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.22s ease,
            filter 0.2s ease !important;
        }
        .delete-btn-danger:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.02) !important;
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.5) !important;
          filter: brightness(1.05);
        }
        .delete-btn-danger:active:not(:disabled) {
          transform: translateY(0.5px) scale(0.98) !important;
        }
        .delete-btn-cancel {
          transition: all 0.2s ease !important;
        }
        .delete-btn-cancel:hover:not(:disabled) {
          transform: translateY(-1.5px) !important;
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'} !important;
        }
      `}</style>

      {/* Backdrop with Blur */}
      <div
        className="delete-backdrop"
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal Dialog Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="delete-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '410px',
          borderRadius: '24px',
          padding: '2rem 1.75rem 1.6rem',
          boxSizing: 'border-box',
          backgroundColor: isDark ? '#18181B' : '#FFFFFF',
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.14) 0%, transparent 65%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(239, 68, 68, 0.08) 0%, transparent 65%)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)'
            : '0 20px 48px -10px rgba(0, 0, 0, 0.14), 0 4px 16px -2px rgba(0, 0, 0, 0.06)',
          zIndex: 10,
          textAlign: 'center',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top-Right */}
        <button
          type="button"
          className="delete-close-btn"
          onClick={handleClose}
          disabled={isDeleting}
          aria-label="Tutup modal"
          title="Tutup"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
            border: 'none',
            color: isDark ? '#A1A1AA' : '#64748B',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            padding: 0,
            margin: 0,
            boxShadow: 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Danger Icon Badge with Halo */}
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '20px',
            margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(225, 29, 72, 0.12) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulseHalo 2.5s infinite',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </div>

        {/* Title */}
        <h3
          id="delete-dialog-title"
          style={{
            margin: '0 0 0.55rem',
            fontSize: '1.28rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          style={{
            margin: '0 0 1.75rem',
            fontSize: '0.88rem',
            lineHeight: 1.55,
            color: isDark ? '#A1A1AA' : '#64748B',
            padding: '0 0.5rem',
          }}
        >
          {description}
        </p>

        {/* Action Buttons Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {/* Cancel Button */}
          <button
            type="button"
            className="delete-btn-cancel"
            onClick={handleClose}
            disabled={isDeleting}
            style={{
              padding: '0.72rem 1rem',
              borderRadius: '14px',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(203, 213, 225, 0.9)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(248, 250, 252, 0.9)',
              color: isDark ? '#E2E8F0' : '#334155',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: 'none',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {cancelLabel}
          </button>

          {/* Delete Confirm Button */}
          <button
            type="button"
            className="delete-btn-danger"
            onClick={handleConfirm}
            disabled={isDeleting}
            style={{
              padding: '0.72rem 1rem',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #EF4444 0%, #E11D48 100%)',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.38)',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {isDeleting ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"></path>
                </svg>
                <span>Menghapus...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
