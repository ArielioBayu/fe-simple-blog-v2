"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/context';
import { DeleteConfirmModal } from './DeleteConfirmModal';

export interface PostMenuDropdownProps {
  isSaved?: boolean;
  isAuthor?: boolean;
  onBookmarkToggle: () => void;
  onShare: () => void;
  onDeletePost?: () => void;
}

export function PostMenuDropdown({
  isSaved = false,
  isAuthor = false,
  onBookmarkToggle,
  onShare,
  onDeletePost,
}: PostMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Close on outside click or ESC key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmarkToggle();
    setIsOpen(false);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
    setIsOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setShowDeleteModal(true);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Three dots button (Instagram-style) */}
      <button
        type="button"
        className="post-menu-trigger-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Opsi postingan"
        title="Opsi postingan"
        style={{
          width: '32px',
          height: '32px',
          minWidth: '32px',
          minHeight: '32px',
          maxWidth: '32px',
          maxHeight: '32px',
          padding: 0,
          margin: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isOpen
            ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)')
            : 'transparent',
          border: 'none',
          boxShadow: 'none',
          color: isDark ? '#F1F5F9' : '#262626',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isOpen
            ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)')
            : 'transparent';
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ display: 'block', pointerEvents: 'none' }}
        >
          <circle cx="5" cy="12" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="19" cy="12" r="2.2" />
        </svg>
      </button>

      {/* Dropdown Menu Popup (Text-only, perfectly aligned) */}
      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            width: '185px',
            backgroundColor: isDark ? 'rgba(26, 26, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '14px',
            boxShadow: isDark
              ? '0 16px 36px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)'
              : '0 14px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
            padding: '6px',
            transformOrigin: 'top right',
            animation: 'fadeIn 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Menu 1: Simpan ke favorit (Text-only) */}
          <button
            type="button"
            role="menuitem"
            className="post-menu-item-btn"
            onClick={handleBookmarkClick}
            style={{
              width: '100%',
              display: 'block',
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
              color: isDark ? '#F1F5F9' : '#1E293B',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {isSaved ? 'Hapus dari favorit' : 'Simpan ke favorit'}
          </button>

          {/* Menu 2: Bagikan (Text-only) */}
          <button
            type="button"
            role="menuitem"
            className="post-menu-item-btn"
            onClick={handleShareClick}
            style={{
              width: '100%',
              display: 'block',
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
              color: isDark ? '#F1F5F9' : '#1E293B',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Bagikan
          </button>

          {/* Menu 3: Hapus (Khusus author pembuat postingan, text-only) */}
          {isAuthor && onDeletePost && (
            <>
              <div
                style={{
                  height: '1px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  margin: '4px 0',
                }}
              />
              <button
                type="button"
                role="menuitem"
                className="post-menu-item-btn"
                onClick={handleDeleteClick}
                style={{
                  width: '100%',
                  display: 'block',
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  boxShadow: 'none',
                  color: '#EF4444',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark
                    ? 'rgba(239, 68, 68, 0.14)'
                    : 'rgba(239, 68, 68, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Hapus
              </button>
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal for Post Deletion */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          onDeletePost?.();
        }}
      />
    </div>
  );
}
