"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useTheme, useLanguage } from '@/context';
import { authService, uploadService, followService, postService } from '@/services';
import { UserProfile, RelationshipStatus, Post } from '@/types';
import { FollowListModal } from './FollowListModal';
import { FollowButton } from './FollowButton';
import { PrivateAccountLocked } from './PrivateAccountLocked';

import { getBannerBackground } from '@/lib/bannerPresets';

interface UserProfileModalProps {
  isOpen: boolean;
  userId: number | null;
  fallbackUsername?: string;
  onClose: () => void;
  onPostClick?: (post: Post) => void;
}

function UserProfileModalContent({
  userId,
  fallbackUsername,
  onClose,
  onPostClick,
}: {
  userId: number;
  fallbackUsername?: string;
  onClose: () => void;
  onPostClick?: (post: Post) => void;
}) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [followListTab, setFollowListTab] = useState<'followers' | 'following' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  // Top 3 posts for public / permitted accounts
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Smooth exit transition handler
  const handleClose = useCallback(() => {
    if (animateOut) return;
    setAnimateOut(true);
    setTimeout(() => {
      onClose();
    }, 280);
  }, [animateOut, onClose]);

  // Esc key to close & lock body scroll
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

  // Fetch target user profile by ID using backend API: GET /profile/:id
  useEffect(() => {
    let ignore = false;

    async function loadTargetUser() {
      setLoading(true);
      setError(null);
      setAvatarError(false);

      try {
        const data = await authService.getUserProfileById(userId);
        if (!ignore) {
          if (data) {
            setProfile(data);
          } else {
            if (fallbackUsername) {
              setProfile({
                id: userId,
                username: fallbackUsername,
                email: '',
                bio: '',
                created_at: new Date().toISOString(),
                stats: {
                  stories_count: 0,
                  saved_count: 0,
                  likes_count: 0,
                  followers_count: 0,
                  following_count: 0,
                },
              });
            } else {
              setError('Pengguna tidak ditemukan atau profil tidak tersedia.');
            }
          }
        }

        // Fetch 360 relationship status if authenticated and not self
        if (currentUser && currentUser.id !== userId) {
          try {
            const relRes = await followService.getRelationship(userId);
            if (!ignore && relRes.data) {
              setRelationship(relRes.data);
            }
          } catch {
            // Relationship endpoint fallback
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTargetUser();

    return () => {
      ignore = true;
    };
  }, [userId, fallbackUsername, currentUser]);

  const isCurrentUser = currentUser?.id === userId;
  const isPrivate = Boolean(profile?.is_private ?? relationship?.is_private ?? false);
  const canViewContent = isCurrentUser || !isPrivate || Boolean(relationship?.can_view_content);

  // Fetch top 3 posts when account is public or content is permitted
  useEffect(() => {
    let ignore = false;

    if (!userId || !canViewContent) {
      setUserPosts([]);
      return;
    }

    async function loadUserPosts() {
      setPostsLoading(true);
      try {
        const res = await postService.getUserPosts(userId, 1, 3);
        if (!ignore && res.data) {
          setUserPosts(res.data.slice(0, 3));
        }
      } catch {
        if (!ignore) setUserPosts([]);
      } finally {
        if (!ignore) setPostsLoading(false);
      }
    }

    loadUserPosts();

    return () => {
      ignore = true;
    };
  }, [userId, canViewContent]);

  const handleFollowToggle = async () => {
    if (followLoading || isCurrentUser) return;
    setFollowLoading(true);

    try {
      const isCurrentlyFollowing = relationship?.is_following;
      const isCurrentlyPending = relationship?.is_pending;

      if (isCurrentlyFollowing || isCurrentlyPending) {
        // Unfollow or Cancel Request
        await followService.unfollowUser(userId);
        setRelationship((prev) =>
          prev
            ? {
                ...prev,
                is_following: false,
                is_pending: false,
                can_view_content: !prev.is_private,
              }
            : null
        );
        if (isCurrentlyFollowing) {
          setProfile((prev) => {
            if (!prev) return null;
            const curCount = prev.stats?.followers_count || 0;
            return {
              ...prev,
              stats: {
                ...prev.stats,
                stories_count: prev.stats?.stories_count || 0,
                saved_count: prev.stats?.saved_count || 0,
                likes_count: prev.stats?.likes_count || 0,
                following_count: prev.stats?.following_count || 0,
                followers_count: Math.max(0, curCount - 1),
              },
            };
          });
        }
      } else {
        // Follow User
        const res = await followService.followUser(userId);
        const isPending = res.data?.status === 'pending';

        setRelationship((prev) =>
          prev
            ? {
                ...prev,
                is_following: !isPending,
                is_pending: isPending,
                can_view_content: !isPending || prev.can_view_content,
              }
            : null
        );

        if (!isPending) {
          setProfile((prev) => {
            if (!prev) return null;
            const curCount = prev.stats?.followers_count || 0;
            return {
              ...prev,
              stats: {
                ...prev.stats,
                stories_count: prev.stats?.stories_count || 0,
                saved_count: prev.stats?.saved_count || 0,
                likes_count: prev.stats?.likes_count || 0,
                following_count: prev.stats?.following_count || 0,
                followers_count: curCount + 1,
              },
            };
          });
        }
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Gagal memperbarui status ikuti');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const username = profile?.username || fallbackUsername || 'Pengguna';

  // Real bio from API response JSON - without hardcode
  const rawBio = typeof profile?.bio === 'string' ? profile.bio.trim() : '';
  const hasBio = rawBio.length > 0;
  const displayBio = hasBio ? rawBio : 'belum ada bio';

  // Real avatar & banner from API response JSON
  const rawAvatar = profile?.avatar_url || (profile as unknown as { avatar?: string })?.avatar || null;
  const rawBanner = profile?.banner_url || (profile as unknown as { banner?: string })?.banner || null;
  const avatarUrl = rawAvatar && !avatarError ? uploadService.getImageUrl(rawAvatar) : null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      return date.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const backdropClass = `user-modal-backdrop${animateOut ? ' out' : ''}`;
  const cardClass = `user-modal-card${animateOut ? ' out' : ''}`;

  return (
    <>
      <style>{`
        @keyframes userModalBackdropFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
        }
        @keyframes userModalBackdropFadeOut {
          from {
            opacity: 1;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
          }
          to {
            opacity: 0;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
          }
        }
        @keyframes userModalSpringIn {
          0% {
            opacity: 0;
            transform: translateY(32px) scale(0.92);
          }
          65% {
            opacity: 1;
            transform: translateY(-4px) scale(1.018);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes userModalSpringOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(22px) scale(0.93);
          }
        }

        .user-modal-backdrop {
          animation: userModalBackdropFadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .user-modal-backdrop.out {
          animation: userModalBackdropFadeOut 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .user-modal-card {
          animation: userModalSpringIn 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .user-modal-card.out {
          animation: userModalSpringOut 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .user-modal-close-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 0.2s ease,
                      color 0.2s ease,
                      box-shadow 0.2s ease,
                      border-color 0.2s ease !important;
        }
        .user-modal-close-btn:hover {
          transform: rotate(90deg) scale(1.12) !important;
          background-color: rgba(239, 68, 68, 0.9) !important;
          color: #FFFFFF !important;
          border-color: rgba(255, 255, 255, 0.8) !important;
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.5) !important;
        }
        .user-modal-close-btn:active {
          transform: rotate(90deg) scale(0.92) !important;
        }

        .user-profile-post-thumb {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease;
        }
        .user-profile-post-thumb:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
        }
        .user-profile-post-thumb img {
          transition: transform 0.3s ease;
        }
        .user-profile-post-thumb:hover img {
          transform: scale(1.06);
        }
        .user-profile-thumb-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.52);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          opacity: 0;
          transition: opacity 0.2s ease;
          color: #ffffff;
          font-weight: 700;
          z-index: 3;
        }
        .user-profile-post-thumb:hover .user-profile-thumb-overlay {
          opacity: 1;
        }

        @keyframes shimmerPulse {
          0% { opacity: 0.35; }
          50% { opacity: 0.8; }
          100% { opacity: 0.35; }
        }
        .skeleton-shimmer {
          animation: shimmerPulse 1.4s ease-in-out infinite;
        }
      `}</style>

      <div
        className={backdropClass}
        onClick={handleBackdropClick}
        style={styles.overlay}
      >
        <div
          className={cardClass}
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          style={{
            ...styles.modalCard,
            maxWidth: canViewContent ? '510px' : '430px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: isDark
              ? 'linear-gradient(160deg, #18181B 0%, #0F0F12 100%)'
              : 'linear-gradient(160deg, #FFFFFF 0%, #FAFAFA 100%)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 25px 65px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.06)'
              : '0 25px 65px -15px rgba(99, 102, 241, 0.24), 0 10px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Prominent Circular Close Button with Animated Hover */}
          <button
            type="button"
            className="user-modal-close-btn"
            onClick={handleClose}
            aria-label="Tutup modal profil"
            title="Tutup"
            style={styles.closeBtn}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block', pointerEvents: 'none' }}
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Modal Top Banner Cover Strip */}
          <div
            style={{
              ...styles.banner,
              background: getBannerBackground(rawBanner),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {isCurrentUser && (
              <div style={styles.selfBadge} title="Akun Anda Sendiri">
                <span>Akun Anda</span>
              </div>
            )}
          </div>

          {/* Content Container */}
          <div style={styles.content}>
            {actionError && (
              <div
                role="alert"
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '0.75rem',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{actionError}</span>
              </div>
            )}

            {/* Avatar Row */}
            <div style={styles.avatarRow}>
              <div className="story-avatar-wrap" style={{ width: '84px', height: '84px' }}>
                <div className="story-avatar-inner" style={{ position: 'relative' }}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={username}
                      onError={() => setAvatarError(true)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={styles.avatarLetter}>
                      {username.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              /* Loading Skeleton */
              <div style={styles.skeletonContainer}>
                <div style={styles.skeletonLineLarge}></div>
                <div style={styles.skeletonLineSmall}></div>
                <div style={styles.skeletonStats}>
                  <div style={styles.skeletonStatBox}></div>
                  <div style={styles.skeletonStatBox}></div>
                  <div style={styles.skeletonStatBox}></div>
                </div>
              </div>
            ) : error ? (
              /* Error State */
              <div style={styles.errorContainer}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                <h4 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--heading-color)' }}>
                  Tidak Dapat Memuat Profil
                </h4>
                <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  {error}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: '1rem', padding: '0.55rem 1.5rem', borderRadius: '12px' }}
                  onClick={handleClose}
                >
                  Close Profile
                </button>
              </div>
            ) : (
              /* User Info, Bio & Stats */
              <>
                <div style={styles.headerInfo}>
                  <div style={styles.nameRow}>
                    <h3 id="user-modal-title" style={styles.username}>
                      @{username}
                    </h3>
                    {(profile?.is_private || relationship?.is_private) && (
                      <span
                        title="Akun Privat"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                          fontSize: '0.75rem',
                          cursor: 'default',
                        }}
                      >
                        🔒
                      </span>
                    )}
                  </div>

                  {profile?.email && (
                    <span style={styles.emailText}>{profile.email}</span>
                  )}

                  {profile?.created_at && (
                    <span style={styles.joinedText}>
                      🗓️ Bergabung sejak {formatDate(profile.created_at)}
                    </span>
                  )}
                </div>

                {/* Bio Box */}
                <div
                  style={{
                    ...styles.bioContainer,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(241, 245, 249, 0.7)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.8)',
                  }}
                >
                  <p
                    style={{
                      ...styles.bioText,
                      fontStyle: hasBio ? 'normal' : 'italic',
                      color: hasBio ? 'var(--fg-primary)' : 'var(--fg-muted)',
                      opacity: hasBio ? 1 : 0.85,
                    }}
                  >
                    {hasBio ? `“${displayBio}”` : displayBio}
                  </p>
                </div>

                {/* Metrics & Social Stats with Clickable Followers/Following */}
                <div
                  style={{
                    ...styles.statsBar,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(248, 250, 252, 0.9)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.9)',
                  }}
                >
                  <div style={styles.statItem}>
                    <strong style={styles.statNumber}>
                      {profile?.stats?.stories_count ?? 0}
                    </strong>
                    <span style={styles.statLabel}>Stories</span>
                  </div>

                  <div style={styles.statDivider}></div>

                  <div
                    style={{ ...styles.statItem, cursor: 'pointer' }}
                    onClick={() => setFollowListTab('followers')}
                    title="Lihat Daftar Pengikut"
                  >
                    <strong style={styles.statNumber}>
                      {profile?.stats?.followers_count ?? 0}
                    </strong>
                    <span style={{ ...styles.statLabel, color: 'var(--social-blue)' }}>Pengikut</span>
                  </div>

                  <div style={styles.statDivider}></div>

                  <div
                    style={{ ...styles.statItem, cursor: 'pointer' }}
                    onClick={() => setFollowListTab('following')}
                    title="Lihat Daftar Mengikuti"
                  >
                    <strong style={styles.statNumber}>
                      {profile?.stats?.following_count ?? 0}
                    </strong>
                    <span style={{ ...styles.statLabel, color: 'var(--social-blue)' }}>Mengikuti</span>
                  </div>

                  <div style={styles.statDivider}></div>

                  <div style={styles.statItem}>
                    <strong style={styles.statNumber}>
                      {profile?.stats?.likes_count ?? 0}
                    </strong>
                    <span style={styles.statLabel}>Likes</span>
                  </div>
                </div>

                {/* ── 3 RECENT POSTS SECTION (FOR PUBLIC & PERMITTED PROFILES) ── */}
                {canViewContent && (
                  <div style={styles.recentPostsSection}>
                    <div style={styles.recentPostsHeader}>
                      <span style={styles.recentPostsTitle}>
                        {t.profile.recentPosts}
                      </span>
                      {profile?.stats?.stories_count !== undefined && profile.stats.stories_count > 0 && (
                        <span style={styles.recentPostsBadge}>
                          {profile.stats.stories_count} {t.profile.storiesCount.toLowerCase()}
                        </span>
                      )}
                    </div>

                    {postsLoading ? (
                      <div style={styles.recentPostsGrid}>
                        {[0, 1, 2].map((idx) => (
                          <div
                            key={idx}
                            style={{
                              ...styles.postThumbBox,
                              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                            }}
                            className="skeleton-shimmer"
                          />
                        ))}
                      </div>
                    ) : userPosts.length > 0 ? (
                      <div style={styles.recentPostsGrid}>
                        {userPosts.map((postItem) => {
                          const cover = (postItem.media && postItem.media.length > 0)
                            ? postItem.media[0].file_path
                            : (postItem.file_path || postItem.filepath);
                          const coverUrl = cover ? uploadService.getImageUrl(cover) : null;
                          const isMulti = Boolean(postItem.media && postItem.media.length > 1);

                          return (
                            <div
                              key={postItem.id}
                              style={{
                                ...styles.postThumbBox,
                                backgroundColor: isDark ? '#1a1a1f' : '#f1f5f9',
                              }}
                              className="user-profile-post-thumb"
                              onClick={() => {
                                handleClose();
                                if (onPostClick) {
                                  onPostClick(postItem);
                                } else {
                                  router.push(`/?postId=${postItem.id}`);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleClose();
                                  if (onPostClick) {
                                    onPostClick(postItem);
                                  } else {
                                    router.push(`/?postId=${postItem.id}`);
                                  }
                                }
                              }}
                              title={postItem.post_title}
                            >
                              {coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={coverUrl}
                                  alt={postItem.post_title}
                                  style={styles.postThumbImg}
                                  loading="lazy"
                                />
                              ) : (
                                <div style={styles.postThumbTextFallback}>
                                  <span style={styles.postThumbIcon}>✍️</span>
                                  <p style={styles.postThumbTextTitle}>{postItem.post_title}</p>
                                </div>
                              )}

                              {isMulti && (
                                <div style={styles.multiPhotoBadge} title="Carousel (Multi-foto)">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="8" y="2" width="14" height="14" rx="2" ry="2" />
                                    <path d="M4 8v12a2 2 0 0 0 2 2h12" />
                                  </svg>
                                </div>
                              )}

                              {/* Interactive Hover Overlay with Post Title */}
                              <div className="user-profile-thumb-overlay" style={styles.postThumbOverlay}>
                                <div style={styles.overlayInner}>
                                  <p style={styles.overlayTitle}>{postItem.post_title}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={styles.emptyPostsBox}>
                        <span style={{ fontSize: '1.3rem' }}>📖</span>
                        <p style={styles.emptyPostsText}>{t.profile.noPostsYet}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Private Account Content Gating Notice */}
                {!isCurrentUser && isPrivate && !canViewContent && (
                  <PrivateAccountLocked style={{ margin: '0 0 1.25rem', width: '100%' }} />
                )}

                {/* Footer Actions */}
                <div style={styles.footerActions}>
                  {isCurrentUser ? (
                    <Link
                      href="/profile"
                      className="btn btn-primary"
                      style={styles.actionBtn}
                      onClick={handleClose}
                    >
                      Buka Halaman Profil Saya &rarr;
                    </Link>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.65rem', width: '100%', alignItems: 'center' }}>
                      {relationship ? (
                        <FollowButton
                          targetUserId={userId}
                          targetUsername={username}
                          initialRelationship={relationship}
                          onRelationshipChange={(updated) => {
                            setRelationship(updated);
                            // Refresh counts
                            authService.getUserProfileById(userId).then((fresh) => {
                              if (fresh) setProfile(fresh);
                            }).catch(() => {});
                          }}
                          onEditProfileClick={handleClose}
                          style={{
                            flex: 1,
                            padding: '0.8rem 1.25rem',
                            borderRadius: '14px',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className="btn btn-primary"
                          style={{ ...styles.actionBtn, flex: 1 }}
                        >
                          {followLoading ? 'Memproses...' : 'Ikuti'}
                        </button>
                      )}

                      {canViewContent ? (
                        <button
                          type="button"
                          className="btn btn-secondary user-profile-view-full-btn"
                          style={{
                            padding: '0.8rem 1.15rem',
                            borderRadius: '14px',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => {
                            handleClose();
                            router.push(`/profile/${userId}`);
                          }}
                          title="Lihat profil lengkap dan semua cerita"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>{t.profile.viewProfile || 'Lihat Profil'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '0.8rem 1.25rem',
                            borderRadius: '14px',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                          }}
                          onClick={handleClose}
                        >
                          {t.common.close || 'Tutup'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* FollowListModal when clicking followers or following stats */}
                {followListTab && (
                  <FollowListModal
                    isOpen={true}
                    onClose={() => setFollowListTab(null)}
                    userId={userId}
                    username={username}
                    initialTab={followListTab}
                    onRelationshipChange={async () => {
                      const refreshed = await authService.getUserProfileById(userId);
                      if (refreshed) setProfile(refreshed);
                      if (currentUser && currentUser.id !== userId) {
                        const relRes = await followService.getRelationship(userId);
                        if (relRes.data) setRelationship(relRes.data);
                      }
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function UserProfileModal({
  isOpen,
  userId,
  fallbackUsername,
  onClose,
  onPostClick,
}: UserProfileModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!isOpen || !mounted || userId === null) return null;

  return createPortal(
    <UserProfileModalContent
      key={`user-profile-${userId}`}
      userId={userId}
      fallbackUsername={fallbackUsername}
      onClose={onClose}
      onPostClick={onPostClick}
    />,
    document.body
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1rem',
  },
  modalCard: {
    position: 'relative',
    width: '100%',
    borderRadius: '24px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  closeBtn: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    zIndex: 30,
    width: '36px',
    height: '36px',
    minWidth: '36px',
    minHeight: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1.5px solid rgba(255, 255, 255, 0.45)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
    padding: 0,
  },
  banner: {
    height: '115px',
    width: '100%',
    position: 'relative',
    flexShrink: 0,
  },
  selfBadge: {
    position: 'absolute',
    top: '14px',
    left: '14px',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: '9999px',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    zIndex: 10,
  },
  content: {
    padding: '0 1.5rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  avatarRow: {
    marginTop: '-42px',
    marginBottom: '0.85rem',
    zIndex: 2,
  },
  avatarLetter: {
    fontSize: '1.75rem',
    fontWeight: 800,
    background: 'var(--ig-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  username: {
    fontSize: '1.3rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit), sans-serif',
    letterSpacing: '-0.02em',
  },
  emailText: {
    fontSize: '0.82rem',
    color: 'var(--fg-muted)',
    fontWeight: 500,
  },
  joinedText: {
    fontSize: '0.75rem',
    color: 'var(--fg-subtle)',
    marginTop: '2px',
    fontWeight: 500,
  },
  bioContainer: {
    margin: '0.9rem 0 1.15rem',
    padding: '0.85rem 1.15rem',
    borderRadius: '16px',
    width: '100%',
  },
  bioText: {
    fontSize: '0.9rem',
    lineHeight: 1.5,
    margin: 0,
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    padding: '0.95rem 0.6rem',
    borderRadius: '18px',
    marginBottom: '1.25rem',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit), sans-serif',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--fg-muted)',
    marginTop: '3px',
    fontWeight: 600,
  },
  statDivider: {
    width: '1px',
    height: '26px',
    backgroundColor: 'var(--border-subtle)',
    opacity: 0.7,
  },

  /* 3 Recent Posts Section */
  recentPostsSection: {
    width: '100%',
    marginBottom: '1.25rem',
  },
  recentPostsHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.65rem',
    padding: '0 2px',
  },
  recentPostsTitle: {
    fontSize: '0.86rem',
    fontWeight: 700,
    fontFamily: 'var(--font-outfit)',
    color: 'var(--heading-color)',
    letterSpacing: '-0.01em',
  },
  recentPostsBadge: {
    fontSize: '0.74rem',
    color: 'var(--fg-muted)',
    fontWeight: 600,
  },
  recentPostsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    width: '100%',
  },
  postThumbBox: {
    position: 'relative',
    aspectRatio: '1 / 1',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  postThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  postThumbTextFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.08), rgba(131, 58, 180, 0.12))',
  },
  postThumbIcon: {
    fontSize: '1.1rem',
    marginBottom: '3px',
  },
  postThumbTextTitle: {
    fontSize: '0.68rem',
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.25,
    color: 'var(--heading-color)',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  multiPhotoBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    padding: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
  postThumbOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px',
    textAlign: 'center',
    zIndex: 3,
  },
  overlayInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  overlayTitle: {
    margin: 0,
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.25,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
  emptyPostsBox: {
    padding: '1.2rem 1rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(125, 125, 125, 0.05)',
    border: '1px dashed var(--border)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  emptyPostsText: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'var(--fg-muted)',
    fontFamily: 'var(--font-sans)',
  },

  footerActions: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
    padding: '0.8rem 1.25rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '0.92rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
  },
  skeletonContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '1rem 0',
  },
  skeletonLineLarge: {
    width: '140px',
    height: '20px',
    borderRadius: '8px',
    backgroundColor: 'rgba(125, 125, 125, 0.15)',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  skeletonLineSmall: {
    width: '200px',
    height: '14px',
    borderRadius: '6px',
    backgroundColor: 'rgba(125, 125, 125, 0.12)',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  skeletonStats: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    marginTop: '1rem',
  },
  skeletonStatBox: {
    flex: 1,
    height: '52px',
    borderRadius: '12px',
    backgroundColor: 'rgba(125, 125, 125, 0.12)',
    animation: 'pulse 1.5s infinite ease-in-out',
  },
  errorContainer: {
    padding: '1.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
};
