"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchUsers } from '@/services/user.service';
import { uploadService } from '@/services/upload.service';
import { SearchUserItem } from '@/types';
import { useLanguage, useTheme } from '@/context';

interface SearchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: SearchUserItem) => void;
}

export function SearchUserModal({ isOpen, onClose, onSelectUser }: SearchUserModalProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    if (animateOut) return;
    setAnimateOut(true);
    setTimeout(() => {
      setAnimateOut(false);
      onClose();
      setKeyword('');
      setResults([]);
    }, 240);
  }, [animateOut, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await searchUsers(keyword.trim(), 1, 25);
        setResults(response.data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Keyboard escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen) return null;

  const modalNode = (
    <div
      style={styles.overlay}
      className={`search-modal-backdrop ${animateOut ? 'out' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <style>{`
        @keyframes searchModalFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        }
        @keyframes searchModalFadeOut {
          from { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
          to { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
        }
        @keyframes searchModalSpringIn {
          0% { opacity: 0; transform: translateY(28px) scale(0.95); }
          65% { opacity: 1; transform: translateY(-4px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes searchModalSpringOut {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(18px) scale(0.96); }
        }
        .search-modal-backdrop {
          animation: searchModalFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .search-modal-backdrop.out {
          animation: searchModalFadeOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .search-modal-card {
          animation: searchModalSpringIn 0.34s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .search-modal-card.out {
          animation: searchModalSpringOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .search-modal-input:focus {
          border-color: var(--brand-coral) !important;
          box-shadow: 0 0 0 3px rgba(225, 48, 108, 0.18) !important;
        }
        .search-user-item-hover {
          transition: all 0.18s ease;
        }
        .search-user-item-hover:hover {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)'} !important;
          transform: translateY(-1px);
        }
        .search-close-btn {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.18s ease, color 0.18s ease;
        }
        .search-close-btn:hover {
          transform: rotate(90deg) scale(1.08);
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.1)'} !important;
        }
        .search-clear-btn {
          transition: transform 0.18s ease, background-color 0.18s ease;
        }
        .search-clear-btn:hover {
          transform: scale(1.12);
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.14)'} !important;
        }
      `}</style>

      <div
        className={`search-modal-card ${animateOut ? 'out' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-heading"
        style={{
          ...styles.dialog,
          backgroundColor: isDark ? '#141417' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 25px 65px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)'
            : '0 25px 65px -15px rgba(0, 0, 0, 0.2), 0 10px 30px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Header */}
        <div
          style={{
            ...styles.header,
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={styles.titleRow}>
            {/* Gradient Icon Badge */}
            <div style={styles.iconBadge}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div>
              <h3 id="search-modal-heading" style={styles.titleText}>
                {t.search.title}
              </h3>
              <p style={styles.subtitleText}>
                {t.search.subtitle}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            className="search-close-btn"
            onClick={handleClose}
            aria-label={t.common.close}
            title={`${t.common.close} (Esc)`}
            style={{
              ...styles.closeBtn,
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.09)',
              color: 'var(--fg-main)',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', pointerEvents: 'none' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Input Bar */}
        <div
          style={{
            ...styles.inputWrap,
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={styles.inputInnerWrap}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={keyword ? 'var(--brand-coral)' : 'var(--fg-muted)'}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.inputIcon}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t.search.placeholder}
              aria-label={t.search.placeholder}
              autoFocus
              className="search-modal-input"
              style={{
                ...styles.inputField,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)',
                border: isDark ? '1.5px solid rgba(255, 255, 255, 0.12)' : '1.5px solid rgba(15, 23, 42, 0.12)',
                color: 'var(--fg-main)',
              }}
            />

            {isLoading ? (
              <div style={styles.spinner} className="spinner" />
            ) : keyword ? (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => {
                  setKeyword('');
                  setResults([]);
                  inputRef.current?.focus();
                }}
                aria-label="Clear input"
                style={{
                  ...styles.inputClearBtn,
                  background: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.1)',
                  color: 'var(--fg-muted)',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {/* Results Body */}
        <div style={styles.body}>
          {results.length > 0 ? (
            <div style={styles.list}>
              {results.map((user) => {
                const avatarSrc = user.avatar_url ? uploadService.getImageUrl(user.avatar_url) : null;
                return (
                  <div
                    key={user.id}
                    onClick={() => {
                      onSelectUser(user);
                      handleClose();
                    }}
                    style={styles.listItem}
                    className="search-user-item-hover"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectUser(user);
                        handleClose();
                      }
                    }}
                  >
                    {/* Avatar with Story Ring gradient vibe */}
                    <div className="story-avatar-wrap" style={{ width: '44px', height: '44px', flexShrink: 0 }}>
                      <div className="story-avatar-inner">
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarSrc}
                            alt={user.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={styles.avatarLetter}>
                            {user.username.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div style={styles.userMeta}>
                      <div style={styles.usernameRow}>
                        <strong style={styles.usernameText}>@{user.username}</strong>
                        {user.is_verified && (
                          <span
                            title={t.search.verified}
                            style={styles.verifiedBadge}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </span>
                        )}
                        {user.is_private && (
                          <span
                            title={t.search.privateAccount}
                            style={styles.privateBadge}
                          >
                            🔒
                          </span>
                        )}
                      </div>
                      {user.bio ? (
                        <p style={styles.bioText}>{user.bio}</p>
                      ) : (
                        <span style={styles.emptyBio}>{t.profile.noBio}</span>
                      )}
                    </div>

                    {/* Relation Pill & Action Chevron */}
                    <div style={styles.rightActionRow}>
                      {user.is_following && (
                        <span
                          style={{
                            ...styles.followingPill,
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)',
                          }}
                        >
                          {t.search.following}
                        </span>
                      )}
                      <div
                        style={{
                          ...styles.chevronBtn,
                          color: 'var(--fg-muted)',
                        }}
                        aria-hidden="true"
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
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isLoading && keyword.trim() ? (
            <div style={styles.emptyContainer}>
              <div
                style={{
                  ...styles.emptyIconCircle,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brand-coral)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h4 style={styles.emptyTitleLarge}>{t.search.noResults}</h4>
              <p style={styles.emptyDescLarge}>
                {t.search.noResultsDesc} &ldquo;{keyword}&rdquo;
              </p>
            </div>
          ) : (
            <div style={styles.hintContainer}>
              <div
                style={{
                  ...styles.emptyIconCircle,
                  backgroundColor: isDark ? 'rgba(225, 48, 108, 0.1)' : 'rgba(225, 48, 108, 0.06)',
                  borderColor: isDark ? 'rgba(225, 48, 108, 0.25)' : 'rgba(225, 48, 108, 0.18)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--brand-coral)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4 style={styles.hintTitle}>{t.search.emptyHintTitle}</h4>
              <p style={styles.hintText}>{t.search.hint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1rem',
  },
  dialog: {
    position: 'relative',
    width: '100%',
    maxWidth: '520px',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.2rem 1.5rem 1rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'var(--ig-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(225, 48, 108, 0.28)',
  },
  titleText: {
    margin: 0,
    fontSize: '1.18rem',
    fontWeight: 800,
    fontFamily: 'var(--font-outfit)',
    color: 'var(--heading-color)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  subtitleText: {
    margin: '3px 0 0 0',
    fontSize: '0.8rem',
    color: 'var(--fg-muted)',
    fontFamily: 'var(--font-sans)',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    minWidth: '36px',
    minHeight: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    outline: 'none',
  },
  inputWrap: {
    padding: '1rem 1.5rem',
  },
  inputInnerWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    pointerEvents: 'none',
    transition: 'stroke 0.2s ease',
  },
  inputField: {
    width: '100%',
    padding: '0.72rem 2.8rem 0.72rem 2.75rem',
    fontSize: '0.92rem',
    fontFamily: 'var(--font-sans)',
    borderRadius: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  inputClearBtn: {
    position: 'absolute',
    right: '12px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  spinner: {
    position: 'absolute',
    right: '14px',
    width: '18px',
    height: '18px',
    border: '2px solid var(--brand-coral)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.75rem 1rem 1rem',
    minHeight: '260px',
    maxHeight: '460px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '14px',
    cursor: 'pointer',
  },
  avatarLetter: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  usernameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  usernameText: {
    fontSize: '0.92rem',
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-sans)',
  },
  verifiedBadge: {
    color: 'var(--social-blue)',
    display: 'flex',
    alignItems: 'center',
  },
  privateBadge: {
    fontSize: '0.8rem',
  },
  bioText: {
    fontSize: '0.8rem',
    color: 'var(--fg-subtle)',
    margin: '3px 0 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: 'var(--font-sans)',
  },
  emptyBio: {
    fontSize: '0.75rem',
    color: 'var(--fg-muted)',
    fontStyle: 'italic',
    display: 'block',
    marginTop: '3px',
    fontFamily: 'var(--font-sans)',
  },
  rightActionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  followingPill: {
    fontSize: '0.74rem',
    fontWeight: 600,
    color: 'var(--fg-muted)',
    border: '1px solid',
    padding: '3px 10px',
    borderRadius: '999px',
  },
  chevronBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  emptyContainer: {
    padding: '2.8rem 1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  emptyTitleLarge: {
    margin: '0 0 6px 0',
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit)',
  },
  emptyDescLarge: {
    margin: 0,
    fontSize: '0.85rem',
    color: 'var(--fg-subtle)',
    fontFamily: 'var(--font-sans)',
  },
  hintContainer: {
    padding: '2.8rem 1.5rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  hintTitle: {
    margin: '0 0 6px 0',
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit)',
  },
  hintText: {
    margin: 0,
    fontSize: '0.86rem',
    color: 'var(--fg-muted)',
    fontFamily: 'var(--font-sans)',
    maxWidth: '320px',
    lineHeight: 1.5,
  },
};
