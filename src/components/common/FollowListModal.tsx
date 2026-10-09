"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth, useTheme } from '@/context';
import { followService, uploadService } from '@/services';
import { FollowUserItem } from '@/types';

export interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  username: string;
  initialTab?: 'followers' | 'following';
  onRelationshipChange?: () => void;
  onUserSelect?: (selectedUserId: number, selectedUsername: string) => void;
}

function FollowListModalContent({
  onClose,
  userId,
  username,
  initialTab = 'followers',
  onRelationshipChange,
  onUserSelect,
}: Omit<FollowListModalProps, 'isOpen'>) {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [items, setItems] = useState<FollowUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchInputVal, setSearchInputVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<number, boolean>>({});
  const [animateOut, setAnimateOut] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSelf = currentUser?.id === userId;

  // Smooth exit handler
  const handleClose = useCallback(() => {
    if (animateOut) return;
    setAnimateOut(true);
    setTimeout(() => {
      onClose();
    }, 240);
  }, [animateOut, onClose]);

  // Escape key & lock scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  // Load data function
  const loadData = useCallback(
    async (targetTab: 'followers' | 'following', pageNum: number, search: string, append = false) => {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const fetcher =
          targetTab === 'followers'
            ? followService.getFollowers(userId, pageNum, 20, search)
            : followService.getFollowing(userId, pageNum, 20, search);

        const res = await fetcher;
        const fetchedItems = Array.isArray(res.data) ? res.data : [];

        if (append) {
          setItems((prev) => [...prev, ...fetchedItems]);
        } else {
          setItems(fetchedItems);
        }

        const pagination = res.pagination as { page?: number; total_page?: number; limit?: number } | undefined;
        if (pagination && pagination.total_page) {
          setHasMore(pageNum < pagination.total_page);
        } else {
          setHasMore(fetchedItems.length === 20);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memuat daftar relasi.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId]
  );

  // Trigger load on tab or search change
  useEffect(() => {
    setPage(1);
    loadData(activeTab, 1, searchQuery, false);
  }, [activeTab, searchQuery, loadData]);

  // Search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInputVal(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(val);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchInputVal('');
    setSearchQuery('');
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadData(activeTab, nextPage, searchQuery, true);
  };

  // Follow / Unfollow / Remove action handler with dual ID normalization
  const handleFollowAction = async (targetUser: FollowUserItem) => {
    const targetId = targetUser.id || targetUser.user_id;
    if (!targetId || actionLoadingIds[targetId]) return;

    setActionLoadingIds((prev) => ({ ...prev, [targetId]: true }));

    try {
      if (isSelf && activeTab === 'followers') {
        // Kick / Remove follower from my own profile
        await followService.removeFollower(targetId);
        setItems((prev) => prev.filter((item) => (item.id || item.user_id) !== targetId));
      } else if (targetUser.is_following) {
        // Unfollow
        await followService.unfollowUser(targetId);
        setItems((prev) =>
          prev.map((item) =>
            (item.id || item.user_id) === targetId ? { ...item, is_following: false } : item
          )
        );
      } else {
        // Follow
        const res = await followService.followUser(targetId);
        const isPending = res.data?.status === 'pending';
        setItems((prev) =>
          prev.map((item) =>
            (item.id || item.user_id) === targetId
              ? { ...item, is_following: !isPending }
              : item
          )
        );
      }

      if (onRelationshipChange) {
        onRelationshipChange();
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Aksi gagal dilakukan.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setActionLoadingIds((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  const backdropClass = `follow-modal-backdrop${animateOut ? ' out' : ''}`;
  const cardClass = `follow-modal-card${animateOut ? ' out' : ''}`;

  return (
    <>
      <style>{`
        @keyframes followBackdropFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        }
        @keyframes followBackdropFadeOut {
          from { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
          to { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
        }
        @keyframes followSpringIn {
          0% { opacity: 0; transform: translateY(24px) scale(0.94); }
          70% { opacity: 1; transform: translateY(-3px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes followSpringOut {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(16px) scale(0.95); }
        }
        .follow-modal-backdrop {
          animation: followBackdropFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .follow-modal-backdrop.out {
          animation: followBackdropFadeOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .follow-modal-card {
          animation: followSpringIn 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .follow-modal-card.out {
          animation: followSpringOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .follow-close-btn {
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease, color 0.2s ease !important;
        }
        .follow-close-btn:hover {
          transform: rotate(90deg) scale(1.1) !important;
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.1)'} !important;
          color: var(--fg-main) !important;
        }
        .follow-close-btn:active {
          transform: rotate(90deg) scale(0.92) !important;
        }
        .follow-user-row {
          transition: background-color 0.18s ease, transform 0.15s ease;
        }
        .follow-user-row:hover {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.03)'};
        }
        .follow-remove-btn:hover {
          background-color: ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.12)'} !important;
          border-color: rgba(239, 68, 68, 0.45) !important;
        }
        .follow-sec-btn:hover {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)'} !important;
        }
      `}</style>

      <div
        className={backdropClass}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
        }}
      >
        <div
          className={cardClass}
          role="dialog"
          aria-modal="true"
          aria-labelledby="follow-modal-title"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '460px',
            height: '530px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: isDark ? '#141417' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 25px 65px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)'
              : '0 25px 65px -15px rgba(0, 0, 0, 0.2), 0 10px 30px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.2rem 1.25rem 0.85rem',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.85rem',
              }}
            >
              <div>
                <h3
                  id="follow-modal-title"
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-display)',
                    margin: 0,
                    color: 'var(--heading-color)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {activeTab === 'followers' ? 'Pengikut' : 'Mengikuti'}
                </h3>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: '0.82rem',
                    color: 'var(--fg-muted)',
                    fontWeight: 500,
                  }}
                >
                  @{username}
                </p>
              </div>

              {/* Close Button - Clear, High-Contrast & Centered SVG */}
              <button
                type="button"
                className="follow-close-btn"
                onClick={handleClose}
                aria-label="Tutup modal"
                title="Tutup (Esc)"
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
                  padding: 0,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.09)',
                  color: 'var(--fg-main)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  outline: 'none',
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

            {/* Tab switchers */}
            <div
              role="tablist"
              aria-label="Filter pengikut atau mengikuti"
              style={{
                display: 'flex',
                borderRadius: '13px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
                padding: '4px',
                marginBottom: '0.85rem',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.04)',
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'followers'}
                onClick={() => {
                  if (activeTab !== 'followers') {
                    setActiveTab('followers');
                    setSearchInputVal('');
                    setSearchQuery('');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem 0',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: activeTab === 'followers' ? 700 : 500,
                  color: activeTab === 'followers' ? (isDark ? '#FFFFFF' : '#0F172A') : 'var(--fg-muted)',
                  backgroundColor: activeTab === 'followers' ? (isDark ? '#27272A' : '#FFFFFF') : 'transparent',
                  boxShadow: activeTab === 'followers' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
              >
                Pengikut
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'following'}
                onClick={() => {
                  if (activeTab !== 'following') {
                    setActiveTab('following');
                    setSearchInputVal('');
                    setSearchQuery('');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.55rem 0',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: activeTab === 'following' ? 700 : 500,
                  color: activeTab === 'following' ? (isDark ? '#FFFFFF' : '#0F172A') : 'var(--fg-muted)',
                  backgroundColor: activeTab === 'following' ? (isDark ? '#27272A' : '#FFFFFF') : 'transparent',
                  boxShadow: activeTab === 'following' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
              >
                Mengikuti
              </button>
            </div>

            {/* Search Input with Clear Button */}
            <div style={{ position: 'relative' }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--fg-muted)',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchInputVal}
                placeholder={`Cari di ${activeTab === 'followers' ? 'pengikut' : 'mengikuti'}...`}
                onChange={handleSearchChange}
                style={{
                  width: '100%',
                  padding: searchInputVal ? '0.6rem 2.2rem 0.6rem 2.3rem' : '0.6rem 0.85rem 0.6rem 2.3rem',
                  borderRadius: '12px',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(15, 23, 42, 0.12)',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)',
                  color: 'var(--fg-main)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              {searchInputVal && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Bersihkan pencarian"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    padding: 0,
                    borderRadius: '50%',
                    border: 'none',
                    background: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.12)',
                    color: 'var(--fg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* User List Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem 0.6rem',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {actionError && (
              <div
                role="alert"
                style={{
                  margin: '0.4rem 0.6rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>⚠</span>
                <span>{actionError}</span>
              </div>
            )}

            {loading ? (
              // Shimmer loading skeletons with unique keys
              <div style={{ padding: '0.75rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={`follow-skeleton-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          width: '45%',
                          height: '14px',
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                          marginBottom: '6px',
                        }}
                      />
                      <div
                        style={{
                          width: '70%',
                          height: '11px',
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: '78px',
                        height: '32px',
                        borderRadius: '9999px',
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', margin: 'auto', color: '#EF4444' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => loadData(activeTab, 1, searchQuery, false)}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                  Coba Lagi
                </button>
              </div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', margin: 'auto', color: 'var(--fg-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                  {activeTab === 'followers' ? '👥' : '✨'}
                </div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--heading-color)', margin: '0 0 0.25rem' }}>
                  {searchQuery
                    ? 'Pengguna Tidak Ditemukan'
                    : activeTab === 'followers'
                    ? 'Belum Ada Pengikut'
                    : 'Belum Mengikuti Siapapun'}
                </h4>
                <p style={{ fontSize: '0.82rem', margin: 0, maxWidth: '280px', lineHeight: 1.4 }}>
                  {searchQuery
                    ? `Tidak ada hasil yang cocok dengan "${searchQuery}"`
                    : activeTab === 'followers'
                    ? 'Pengguna yang mengikuti akun ini akan muncul di sini.'
                    : 'Akun yang diikuti akan muncul di sini.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map((item, idx) => {
                  const targetId = item.id || item.user_id;
                  const isItemSelf = currentUser?.id === targetId;
                  const itemAvatarUrl = item.avatar_url ? uploadService.getImageUrl(item.avatar_url) : null;
                  const isActionLoading = !!(targetId && actionLoadingIds[targetId]);
                  const uniqueKey = targetId ?? `user-${item.username}-${idx}`;

                  return (
                    <div
                      key={uniqueKey}
                      className="follow-user-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '14px',
                        margin: '2px 0',
                      }}
                    >
                      {/* User Info clickable */}
                      <div
                        onClick={() => {
                          if (onUserSelect && targetId) {
                            onUserSelect(targetId, item.username);
                          }
                          handleClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          cursor: 'pointer',
                          flex: 1,
                          minWidth: 0,
                          paddingRight: '0.5rem',
                        }}
                      >
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: itemAvatarUrl
                              ? (isDark ? '#27272A' : '#E2E8F0')
                              : 'linear-gradient(135deg, #FF5A36 0%, #E1306C 50%, #833AB4 100%)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            color: '#FFFFFF',
                            boxShadow: isDark
                              ? '0 2px 8px rgba(0, 0, 0, 0.4)'
                              : '0 2px 8px rgba(0, 0, 0, 0.08)',
                          }}
                        >
                          {itemAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={itemAvatarUrl}
                              alt={item.username}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            (item.username || 'U').substring(0, 2).toUpperCase()
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: 'var(--heading-color)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              @{item.username}
                            </span>
                            {item.is_followed_by && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                                  color: 'var(--fg-muted)',
                                  flexShrink: 0,
                                }}
                              >
                                Follows you
                              </span>
                            )}
                          </div>
                          {item.bio && (
                            <div
                              style={{
                                fontSize: '0.78rem',
                                color: 'var(--fg-muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '1px',
                              }}
                            >
                              {item.bio}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contextual Action Button */}
                      {!isItemSelf && (
                        <div>
                          {isSelf && activeTab === 'followers' ? (
                            <button
                              type="button"
                              onClick={() => handleFollowAction(item)}
                              disabled={isActionLoading}
                              aria-label={`Hapus ${item.username} dari pengikut`}
                              className="follow-remove-btn"
                              style={{
                                padding: '0.45rem 1rem',
                                minWidth: '76px',
                                borderRadius: '9999px',
                                border: isDark ? '1px solid rgba(239, 68, 68, 0.28)' : '1px solid rgba(239, 68, 68, 0.22)',
                                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                                color: '#EF4444',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.18s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                outline: 'none',
                              }}
                            >
                              {isActionLoading ? '...' : 'Hapus'}
                            </button>
                          ) : item.is_following ? (
                            <button
                              type="button"
                              onClick={() => handleFollowAction(item)}
                              disabled={isActionLoading}
                              aria-label={`Berhenti mengikuti ${item.username}`}
                              className="follow-sec-btn"
                              style={{
                                padding: '0.45rem 1rem',
                                minWidth: '88px',
                                borderRadius: '9999px',
                                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)',
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.04)',
                                color: 'var(--fg-main)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.18s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                outline: 'none',
                              }}
                            >
                              {isActionLoading ? '...' : 'Mengikuti'}
                            </button>
                          ) : item.is_followed_by ? (
                            <button
                              type="button"
                              onClick={() => handleFollowAction(item)}
                              disabled={isActionLoading}
                              aria-label={`Ikuti balik ${item.username}`}
                              style={{
                                padding: '0.45rem 1.1rem',
                                minWidth: '88px',
                                borderRadius: '9999px',
                                border: 'none',
                                background: 'var(--ig-btn-gradient)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 10px rgba(225, 48, 108, 0.25)',
                                transition: 'all 0.18s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                outline: 'none',
                              }}
                            >
                              {isActionLoading ? '...' : 'Ikuti Balik'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleFollowAction(item)}
                              disabled={isActionLoading}
                              aria-label={`Ikuti ${item.username}`}
                              style={{
                                padding: '0.45rem 1.1rem',
                                minWidth: '76px',
                                borderRadius: '9999px',
                                border: 'none',
                                background: 'var(--ig-btn-gradient)',
                                color: '#FFFFFF',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                fontFamily: 'var(--font-sans)',
                                cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 10px rgba(225, 48, 108, 0.25)',
                                transition: 'all 0.18s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                outline: 'none',
                              }}
                            >
                              {isActionLoading ? '...' : 'Ikuti'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Load More Button */}
                {hasMore && (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        padding: '0.45rem 1.25rem',
                        borderRadius: '9999px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--social-blue)',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-sans)',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function FollowListModal(props: FollowListModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!props.isOpen || !mounted) return null;

  return createPortal(<FollowListModalContent {...props} />, document.body);
}
