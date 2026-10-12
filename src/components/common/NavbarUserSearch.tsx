"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchUsers } from '@/services/user.service';
import { uploadService } from '@/services/upload.service';
import { SearchUserItem } from '@/types';
import { useLanguage, useTheme } from '@/context';

interface NavbarUserSearchProps {
  onSelectUser?: (user: SearchUserItem) => void;
}

export const NavbarUserSearch: React.FC<NavbarUserSearchProps> = ({ onSelectUser }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce effect: Wait 300ms after user stops typing
  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await searchUsers(keyword.trim(), 1, 8);
        setResults(response.data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Error searching users:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  // Click-outside listener & ESC key listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleUserClick = useCallback((user: SearchUserItem) => {
    setIsOpen(false);
    setKeyword('');
    onSelectUser?.(user);
  }, [onSelectUser]);

  return (
    <div ref={containerRef} style={styles.searchWrapper} className="navbar-user-search-root">
      {/* Search Input Box */}
      <div style={styles.inputContainer}>
        {/* Search Icon */}
        <svg
          style={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || keyword.trim()) setIsOpen(true);
          }}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          style={styles.searchInput}
          className="navbar-search-input"
        />

        {/* Clear Button or Spinner */}
        {isLoading ? (
          <div style={styles.spinner} className="spinner" />
        ) : keyword ? (
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            style={styles.clearBtn}
          >
            &times;
          </button>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          style={{
            ...styles.dropdown,
            backgroundColor: isDark ? '#141417' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 16px 36px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06)'
              : '0 16px 36px -4px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.05)',
          }}
          className="navbar-search-dropdown animate-fade-in"
        >
          {results.length > 0 ? (
            <div style={styles.resultsList}>
              {results.map((item) => {
                const avatarSrc = item.avatar_url ? uploadService.getImageUrl(item.avatar_url) : null;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleUserClick(item)}
                    style={styles.resultItem}
                    className="navbar-search-item"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUserClick(item);
                      }
                    }}
                  >
                    {/* User Avatar */}
                    <div className="story-avatar-wrap" style={{ width: '38px', height: '38px', flexShrink: 0 }}>
                      <div className="story-avatar-inner">
                        {avatarSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarSrc}
                            alt={item.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={styles.avatarLetter}>
                            {item.username.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* User Info */}
                    <div style={styles.userInfo}>
                      <div style={styles.userTitleRow}>
                        <span style={styles.usernameText}>@{item.username}</span>
                        {item.is_verified && (
                          <span
                            title={t.search.verified}
                            style={styles.verifiedBadge}
                          >
                            ✓
                          </span>
                        )}
                        {item.is_private && (
                          <span
                            title={t.search.privateAccount}
                            style={styles.privateBadge}
                          >
                            🔒
                          </span>
                        )}
                      </div>
                      {item.bio && (
                        <p style={styles.bioText}>{item.bio}</p>
                      )}
                    </div>

                    {/* Following Relationship Badge */}
                    {item.is_following && (
                      <span style={styles.followingBadge}>
                        {t.search.following}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : !isLoading && keyword.trim() ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <p style={styles.emptyTitle}>{t.search.noResults}</p>
              <p style={styles.emptyDesc}>
                {t.search.noResultsDesc} &ldquo;{keyword}&rdquo;
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  searchWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: '280px',
    margin: '0 1rem',
  },
  inputContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--fg-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '0.48rem 2.2rem 0.48rem 2.25rem',
    fontSize: '0.86rem',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--btn-secondary-bg)',
    color: 'var(--fg-main)',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  clearBtn: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--fg-muted)',
    fontSize: '1.15rem',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  spinner: {
    position: 'absolute',
    right: '12px',
    width: '14px',
    height: '14px',
    border: '2px solid var(--brand-coral)',
    borderTopColor: 'transparent',
    borderRadius: '50%',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    backgroundColor: 'var(--card-bg)',
    borderRadius: '16px',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-lg)',
    overflow: 'hidden',
    zIndex: 1050,
    minWidth: '290px',
  },
  resultsList: {
    maxHeight: '340px',
    overflowY: 'auto',
    padding: '4px',
  },
  resultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  avatarLetter: {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  usernameText: {
    fontSize: '0.86rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  verifiedBadge: {
    color: 'var(--social-blue)',
    fontSize: '0.78rem',
    fontWeight: 800,
  },
  privateBadge: {
    fontSize: '0.75rem',
  },
  bioText: {
    fontSize: '0.74rem',
    color: 'var(--fg-subtle)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: '2px 0 0 0',
  },
  followingBadge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--fg-muted)',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
    padding: '2px 8px',
    borderRadius: '999px',
    flexShrink: 0,
  },
  emptyState: {
    padding: '1.5rem 1rem',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '1.6rem',
    marginBottom: '0.35rem',
  },
  emptyTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    margin: '0 0 4px 0',
  },
  emptyDesc: {
    fontSize: '0.78rem',
    color: 'var(--fg-subtle)',
    margin: 0,
  },
};
