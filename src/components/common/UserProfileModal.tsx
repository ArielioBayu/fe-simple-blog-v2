"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useAuth } from '@/context';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Esc key to close & lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
        onClose();
      }
    },
    [onClose]
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

  return (
    <div style={styles.overlay} onClick={handleBackdropClick}>
      <div style={styles.modalCard} className="glass animate-scale-up" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
        {/* Tombol Silang (Close Button) di Atas Modal */}
        <button
          style={styles.closeBtn}
          onClick={onClose}
          aria-label="Tutup modal profil"
          title="Tutup"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Banner Cover (Dari API atau fallback gradasi ambient) */}
        <div
          style={{
            ...styles.banner,
            backgroundImage: bannerUrl
              ? `url(${bannerUrl})`
              : 'linear-gradient(135deg, rgba(236,72,153,0.85) 0%, rgba(255,90,54,0.85) 50%, rgba(99,102,241,0.85) 100%)',
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
          {/* Avatar Row (Foto user dari API atau inisial) */}
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
                className="btn btn-secondary"
                style={{ marginTop: '1rem', padding: '0.5rem 1.25rem' }}
                onClick={onClose}
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

              {/* Bio: Diambil langsung dari respons API, atau "belum ada bio" jika kosong */}
              <div style={styles.bioContainer}>
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
              <div style={styles.statsBar}>
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
                    onClick={onClose}
                  >
                    Buka Halaman Profil Saya &rarr;
                  </Link>
                ) : (
                  <button
                    className="btn btn-secondary"
                    style={styles.actionBtn}
                    onClick={onClose}
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
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
    backgroundColor: 'var(--card-bg, #ffffff)',
    borderRadius: '24px',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 20,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    border: '1.5px solid rgba(255, 255, 255, 0.4)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
  banner: {
    height: '120px',
    width: '100%',
    position: 'relative',
  },
  selfBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(6px)',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 10px',
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
    marginTop: '-42px',
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
    fontSize: '1.25rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit), sans-serif',
    letterSpacing: '-0.02em',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  emailText: {
    fontSize: '0.8rem',
    color: 'var(--fg-muted)',
  },
  joinedText: {
    fontSize: '0.75rem',
    color: 'var(--fg-subtle)',
    marginTop: '2px',
  },
  bioContainer: {
    margin: '0.85rem 0 1.15rem',
    padding: '0.75rem 1rem',
    borderRadius: '14px',
    backgroundColor: 'rgba(125, 125, 125, 0.06)',
    border: '1px solid var(--border-subtle)',
    width: '100%',
  },
  bioText: {
    fontSize: '0.88rem',
    lineHeight: 1.45,
    margin: 0,
  },
  statsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    padding: '0.85rem 0.5rem',
    borderRadius: '16px',
    backgroundColor: 'rgba(125, 125, 125, 0.08)',
    border: '1px solid var(--border-subtle)',
    marginBottom: '1.25rem',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    fontFamily: 'var(--font-outfit), sans-serif',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--fg-muted)',
    marginTop: '2px',
    fontWeight: 600,
  },
  statDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--border-subtle)',
  },
  footerActions: {
    width: '100%',
  },
  actionBtn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
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
