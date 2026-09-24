"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth, useTheme } from '@/context';
import { authService, uploadService } from '@/services';
import { UserProfile } from '@/types';

interface UserProfileModalProps {
  isOpen: boolean;
  userId: number | null;
  fallbackUsername?: string;
  onClose: () => void;
}

function UserProfileModalContent({
  userId,
  fallbackUsername,
  onClose,
}: {
  userId: number;
  fallbackUsername?: string;
  onClose: () => void;
}) {
  const { user: currentUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

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
            // If API returned null/404, fallback to minimal structure with no hardcoded bio
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
  }, [userId, fallbackUsername]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const isCurrentUser = currentUser?.id === userId;
  const username = profile?.username || fallbackUsername || 'Pengguna';

  // Real bio from API response JSON - without hardcode
  const rawBio = typeof profile?.bio === 'string' ? profile.bio.trim() : '';
  const hasBio = rawBio.length > 0;
  const displayBio = hasBio ? rawBio : 'belum ada bio';

  // Real avatar & banner from API response JSON
  const rawAvatar = profile?.avatar_url || (profile as unknown as { avatar?: string })?.avatar || null;
  const rawBanner = profile?.banner_url || (profile as unknown as { banner?: string })?.banner || null;
  const avatarUrl = rawAvatar && !avatarError ? uploadService.getImageUrl(rawAvatar) : null;
  const bannerUrl = rawBanner ? uploadService.getImageUrl(rawBanner) : null;

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

          {/* Banner Cover with Vibrant Harmonious Gradient */}
          <div
            style={{
              ...styles.banner,
              backgroundImage: bannerUrl
                ? `url(${bannerUrl})`
                : 'linear-gradient(135deg, #FF5A36 0%, #E11D48 35%, #9333EA 75%, #4F46E5 100%)',
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

                {/* Metrics & Social Stats */}
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

                  <div style={styles.statItem}>
                    <strong style={styles.statNumber}>
                      {profile?.stats?.likes_count ?? 0}
                    </strong>
                    <span style={styles.statLabel}>Likes Diterima</span>
                  </div>

                  <div style={styles.statDivider}></div>

                  <div style={styles.statItem}>
                    <strong style={styles.statNumber}>
                      {profile?.stats?.saved_count ?? 0}
                    </strong>
                    <span style={styles.statLabel}>Tersimpan</span>
                  </div>
                </div>

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
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={styles.actionBtn}
                      onClick={handleClose}
                    >
                      Close Profile
                    </button>
                  )}
                </div>
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
    maxWidth: '430px',
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
    height: '130px',
    width: '100%',
    position: 'relative',
  },
  selfBadge: {
    position: 'absolute',
    top: '14px',
    left: '14px',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 12px',
    borderRadius: '9999px',
    border: '1px solid rgba(255, 255, 255, 0.25)',
  },
  content: {
    padding: '0 1.5rem 1.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  avatarRow: {
    marginTop: '-44px',
    marginBottom: '0.75rem',
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
    marginBottom: '1.35rem',
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
