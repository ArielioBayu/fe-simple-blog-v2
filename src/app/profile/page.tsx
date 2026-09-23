"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context';
import { authService, postService, uploadService } from '@/services';
import { Post, UserProfile } from '@/types';
import { Navbar, Toast, EditProfileModal, LeftNavSidebar } from '@/components';

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, isLoading: authLoading, logout } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<'stories' | 'saved'>('stories');
  const [loading, setLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !authUser)) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, authUser, router]);

  // Fetch full profile and user stories
  useEffect(() => {
    let ignore = false;

    async function loadProfileData() {
      if (!authUser) return;
      setLoading(true);

      try {
        // 1. Fetch freshest user profile & stats from backend
        const profileData = await authService.getUserProfile();
        if (!ignore && profileData) {
          setProfile(profileData);
        } else if (!ignore) {
          setProfile(authUser);
        }

        const targetUserId = profileData?.id || authUser.id;

        // 2. Fetch user's posts
        const postsRes = await postService.getUserPosts(targetUserId, 1, 30);
        if (!ignore && postsRes.data) {
          setUserPosts(postsRes.data);
        }

        // 3. Fetch saved posts from localStorage
        try {
          const savedIdsRaw = localStorage.getItem('saved_posts');
          if (savedIdsRaw) {
            const savedIds: number[] = JSON.parse(savedIdsRaw);
            const allPostsRes = await postService.getAllPosts(1, 50);
            if (!ignore && allPostsRes.data) {
              const matched = allPostsRes.data.filter(p => savedIds.includes(p.id));
              setSavedPosts(matched);
            }
          }
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        if (!ignore) {
          showToast(err instanceof Error ? err.message : 'Gagal memuat profil');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfileData();

    return () => {
      ignore = true;
    };
  }, [authUser]);

  const handleShareProfile = async () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          showToast('Tautan profil berhasil disalin!');
          return;
        } catch {
          // fallback
        }
      }
      showToast(`Profil: @${profile?.username || authUser?.username}`);
    }
  };

  const handleProfileUpdated = async () => {
    showToast('Profil berhasil diperbarui!');
    const fresh = await authService.getUserProfile();
    if (fresh) {
      setProfile(fresh);
    }
  };

  const currentUser = profile || authUser;
  const username = currentUser?.username || 'Creator';
  const bio = currentUser?.bio || 'Kreator & Penulis Cerita di SimpleBlog';
  const avatarSrc = currentUser?.avatar_url && !avatarError ? uploadService.getImageUrl(currentUser.avatar_url) : null;
  const bannerSrc = currentUser?.banner_url ? uploadService.getImageUrl(currentUser.banner_url) : null;

  // Format joined date
  const joinedDate = currentUser?.created_at
    ? new Date(currentUser.created_at.replace(' ', 'T')).toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
      })
    : '2026';

  const storiesCount = currentUser?.stats?.stories_count ?? userPosts.length;
  const likesCount = currentUser?.stats?.likes_count ?? 0;
  const savedCount = currentUser?.stats?.saved_count ?? savedPosts.length;

  if (authLoading || !isAuthenticated || !authUser) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="spinner" style={{ width: '38px', height: '38px', border: '3px solid var(--social-blue)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper} className="animate-fade-in has-left-sidebar">
      <Toast message={toastMessage} />

      {/* Left Navigation Sidebar */}
      <LeftNavSidebar
        onHomeClick={() => router.push('/')}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onToast={showToast}
      />

      <Navbar
        onCreatePost={() => router.push('/')}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onHomeClick={() => router.push('/')}
        onThemeToggled={(theme) => showToast(`Beralih ke mode ${theme}`)}
      />

      <main style={styles.mainContainer} className="container">
        {/* Navigation Breadcrumb */}
        <div style={styles.backNavRow}>
          <Link href="/" style={styles.backBtn} aria-label="Kembali ke Beranda">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        {/* Profile Card Container */}
        <div style={styles.profileHeroCard} className="glass">
          {/* Top Banner Cover Photo */}
          <div
            style={{
              ...styles.coverBanner,
              backgroundImage: bannerSrc ? `url(${bannerSrc})` : 'var(--ig-gradient)',
            }}
          >
            <div style={styles.bannerOverlay} />
          </div>

          {/* Profile Details Header */}
          <div style={styles.profileContentArea}>
            {/* Avatar Row */}
            <div style={styles.avatarRow}>
              <div
                className="story-avatar-wrap"
                style={styles.largeAvatarWrap}
              >
                <div className="story-avatar-inner" style={{ backgroundColor: 'var(--bg-card)' }}>
                  {avatarSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarSrc}
                      alt={username}
                      onError={() => setAvatarError(true)}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <span style={styles.avatarInitials}>
                      {(username || 'U').substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div style={styles.topActionsRow}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={styles.actionBtn}
                  onClick={() => setIsEditProfileOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit Profil</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={styles.actionBtn}
                  onClick={handleShareProfile}
                  title="Bagikan Tautan Profil"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  <span>Bagikan</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ ...styles.actionBtn, color: '#EF4444' }}
                  onClick={logout}
                  title="Keluar dari akun"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Keluar</span>
                </button>
              </div>
            </div>

            {/* Profile Info Header */}
            <div style={styles.userInfoSection}>
              <div style={styles.usernameTitleRow}>
                <h1 style={styles.profileUsername}>@{username}</h1>
              </div>

              {currentUser?.email && (
                <p style={styles.userEmailText}>{currentUser.email}</p>
              )}

              <p style={styles.bioText}>{bio}</p>

              <div style={styles.joinDateRow}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Bergabung sejak {joinedDate}</span>
              </div>
            </div>

            {/* Engagement Metrics Bar */}
            <div style={styles.metricsBar}>
              <div style={styles.metricCard}>
                <strong style={styles.metricNumber}>{storiesCount}</strong>
                <span style={styles.metricLabel}>Cerita Diterbitkan</span>
              </div>

              <div style={styles.metricDivider} />

              <div style={styles.metricCard}>
                <strong style={styles.metricNumber}>{likesCount}</strong>
                <span style={styles.metricLabel}>Total Suka Diterima</span>
              </div>

              <div style={styles.metricDivider} />

              <div style={styles.metricCard}>
                <strong style={styles.metricNumber}>{savedCount}</strong>
                <span style={styles.metricLabel}>Cerita Tersimpan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Cerita Saya vs Tersimpan) */}
        <div style={styles.tabsContainer}>
          <button
            type="button"
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'stories' ? 'var(--social-blue)' : 'transparent',
              color: activeTab === 'stories' ? 'var(--heading-color)' : 'var(--fg-muted)',
              fontWeight: activeTab === 'stories' ? 700 : 500,
            }}
            onClick={() => setActiveTab('stories')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Cerita Saya ({userPosts.length})</span>
          </button>

          <button
            type="button"
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'saved' ? 'var(--social-blue)' : 'transparent',
              color: activeTab === 'saved' ? 'var(--heading-color)' : 'var(--fg-muted)',
              fontWeight: activeTab === 'saved' ? 700 : 500,
            }}
            onClick={() => setActiveTab('saved')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Tersimpan ({savedPosts.length})</span>
          </button>
        </div>

        {/* Stories Content Grid */}
        <section style={styles.storiesGridSection}>
          {loading ? (
            <div style={styles.loadingGrid}>
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-shimmer" style={styles.skeletonGridCard} />
              ))}
            </div>
          ) : activeTab === 'stories' ? (
            userPosts.length === 0 ? (
              <div style={styles.emptyCard} className="glass">
                <div style={styles.emptyIconCircle}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--brand-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h3 style={styles.emptyTitle}>Belum Ada Cerita yang Dipublikasikan</h3>
                <p style={styles.emptySubtitle}>Bagikan pengalaman, tips, atau momen berharga Anda kepada komunitas sekarang.</p>
                <Link href="/" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', marginTop: '0.5rem' }}>
                  + Tulis Cerita Pertama
                </Link>
              </div>
            ) : (
              <div style={styles.storiesGrid}>
                {userPosts.map(post => {
                  const cover = post.file_path || post.filepath;
                  const coverUrl = cover ? uploadService.getImageUrl(cover) : null;

                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      style={styles.storyCardLink}
                      className="glass glass-interactive"
                    >
                      <div style={styles.storyMediaWrapper}>
                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverUrl}
                            alt={post.post_title}
                            style={styles.storyCardImg}
                          />
                        ) : (
                          <div style={styles.storyTextCover}>
                            <span style={styles.storyTextTeaser}>{post.post_title}</span>
                          </div>
                        )}

                        <div style={styles.cardHoverOverlay}>
                          <div style={styles.overlayStatItem}>
                            <span>❤️</span>
                            <span>{post.is_liked ? 1 : 0}</span>
                          </div>
                        </div>
                      </div>

                      <div style={styles.storyCardInfo}>
                        <h4 style={styles.storyCardTitle}>{post.post_title}</h4>
                        <span style={styles.storyCardDate}>
                          {post.created_at ? new Date(post.created_at.replace(' ', 'T')).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            /* Saved Stories Tab */
            savedPosts.length === 0 ? (
              <div style={styles.emptyCard} className="glass">
                <div style={styles.emptyIconCircle}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--brand-indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h3 style={styles.emptyTitle}>Belum Ada Cerita Tersimpan</h3>
                <p style={styles.emptySubtitle}>Klik ikon bookmark pada postingan yang Anda sukai di Feed untuk menyimpannya di sini.</p>
                <Link href="/" className="btn btn-secondary" style={{ padding: '0.65rem 1.5rem', marginTop: '0.5rem' }}>
                  Jelajahi Feed Cerita
                </Link>
              </div>
            ) : (
              <div style={styles.storiesGrid}>
                {savedPosts.map(post => {
                  const cover = post.file_path || post.filepath;
                  const coverUrl = cover ? uploadService.getImageUrl(cover) : null;

                  return (
                    <Link
                      key={post.id}
                      href={`/posts/${post.id}`}
                      style={styles.storyCardLink}
                      className="glass glass-interactive"
                    >
                      <div style={styles.storyMediaWrapper}>
                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverUrl}
                            alt={post.post_title}
                            style={styles.storyCardImg}
                          />
                        ) : (
                          <div style={styles.storyTextCover}>
                            <span style={styles.storyTextTeaser}>{post.post_title}</span>
                          </div>
                        )}
                      </div>

                      <div style={styles.storyCardInfo}>
                        <h4 style={styles.storyCardTitle}>{post.post_title}</h4>
                        <span style={styles.storyCardDate}>Oleh @{post.username}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}
        </section>
      </main>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={handleProfileUpdated}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  mainContainer: {
    flex: 1,
    paddingTop: '1.25rem',
    paddingBottom: '5rem',
    maxWidth: '920px',
  },
  backNavRow: {
    marginBottom: '1rem',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--fg-muted)',
    fontSize: '0.88rem',
    fontWeight: 600,
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--radius-sm)',
    transition: 'var(--transition)',
  },
  profileHeroCard: {
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '2rem',
  },
  coverBanner: {
    height: '190px',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative',
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.45) 100%)',
  },
  profileContentArea: {
    padding: '0 2rem 2rem',
    position: 'relative',
  },
  avatarRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: '-55px',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  largeAvatarWrap: {
    width: '110px',
    height: '110px',
    padding: '3.5px',
    boxShadow: 'var(--shadow-lg)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
  avatarInitials: {
    fontSize: '2.2rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  topActionsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    flexWrap: 'wrap',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.55rem 1.1rem',
    fontSize: '0.86rem',
    fontWeight: 600,
    minHeight: '42px',
  },
  userInfoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  usernameTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  profileUsername: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    letterSpacing: '-0.02em',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
  },
  userEmailText: {
    fontSize: '0.85rem',
    color: 'var(--fg-subtle)',
    margin: 0,
  },
  bioText: {
    fontSize: '0.98rem',
    lineHeight: 1.6,
    color: 'var(--fg-main)',
    maxWidth: '650px',
    marginTop: '0.35rem',
  },
  joinDateRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    color: 'var(--fg-muted)',
    fontSize: '0.82rem',
    marginTop: '0.4rem',
  },
  metricsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: '1.75rem',
    padding: '1rem 0',
    backgroundColor: 'var(--btn-secondary-bg)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  metricCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
    padding: '0 1rem',
  },
  metricNumber: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  metricLabel: {
    fontSize: '0.78rem',
    color: 'var(--fg-muted)',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricDivider: {
    width: '1px',
    height: '32px',
    backgroundColor: 'var(--border)',
  },
  tabsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    borderBottom: '1px solid var(--border)',
    marginBottom: '1.75rem',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    padding: '0.85rem 0.5rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.92rem',
    transition: 'var(--transition)',
  },
  storiesGridSection: {
    width: '100%',
  },
  storiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  storyCardLink: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--transition)',
    textDecoration: 'none',
  },
  storyMediaWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    backgroundColor: 'var(--bg-input)',
    overflow: 'hidden',
  },
  storyCardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'transform 0.3s ease',
  },
  storyTextCover: {
    width: '100%',
    height: '100%',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(99, 102, 241, 0.15) 100%)',
  },
  storyTextTeaser: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  cardHoverOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  overlayStatItem: {
    color: '#ffffff',
    fontSize: '1.1rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  storyCardInfo: {
    padding: '1rem 1.15rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  storyCardTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    lineHeight: 1.35,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  storyCardDate: {
    fontSize: '0.78rem',
    color: 'var(--fg-subtle)',
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  skeletonGridCard: {
    height: '240px',
    borderRadius: 'var(--radius-lg)',
  },
  emptyCard: {
    padding: '3.5rem 2rem',
    borderRadius: 'var(--radius-xl)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
  },
  emptyIconCircle: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: 'var(--btn-secondary-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    margin: 0,
  },
  emptySubtitle: {
    fontSize: '0.9rem',
    color: 'var(--fg-muted)',
    maxWidth: '440px',
    lineHeight: 1.5,
    margin: 0,
  },
};
