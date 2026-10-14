"use client";

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, useLanguage, useTheme } from '@/context';
import { authService, postService, uploadService, followService } from '@/services';
import { Post, UserProfile, RelationshipStatus } from '@/types';
import {
  Navbar,
  Toast,
  LeftNavSidebar,
  FollowListModal,
  FollowButton,
  PrivateAccountLocked,
  CommentDrawer,
  ErrorState,
} from '@/components';
import { getBannerBackground } from '@/lib/bannerPresets';

export default function UserPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = Number(resolvedParams.id);
  const router = useRouter();
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [followListModalTab, setFollowListModalTab] = useState<'followers' | 'following' | null>(null);

  // CommentDrawer state for viewing stories seamlessly
  const [commentDrawerPost, setCommentDrawerPost] = useState<Post | null>(null);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);

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

  // If viewing own ID, seamlessly redirect to /profile
  useEffect(() => {
    if (authUser && authUser.id === userId) {
      router.replace('/profile');
    }
  }, [authUser, userId, router]);

  // Fetch target user profile and relationship status
  useEffect(() => {
    let ignore = false;
    if (!userId || isNaN(userId)) {
      setError('ID Pengguna tidak valid');
      setLoading(false);
      return;
    }

    async function loadTargetProfile() {
      setLoading(true);
      setError(null);
      setAvatarError(false);

      try {
        const [profileData, relRes] = await Promise.allSettled([
          authService.getUserProfileById(userId),
          followService.getRelationship(userId),
        ]);

        if (ignore) return;

        if (profileData.status === 'fulfilled' && profileData.value) {
          setProfile(profileData.value);
        } else {
          setError('Pengguna tidak ditemukan atau profil tidak tersedia.');
        }

        if (relRes.status === 'fulfilled' && relRes.value?.data) {
          setRelationship(relRes.value.data);
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

    loadTargetProfile();

    return () => {
      ignore = true;
    };
  }, [userId]);

  const isCurrentUser = authUser?.id === userId;
  const isPrivate = Boolean(profile?.is_private ?? relationship?.is_private ?? false);
  const canViewContent = isCurrentUser || !isPrivate || Boolean(relationship?.can_view_content);

  // Fetch all posts when permitted
  useEffect(() => {
    let ignore = false;

    if (!userId || !canViewContent) {
      setUserPosts([]);
      return;
    }

    async function loadPosts() {
      setPostsLoading(true);
      try {
        const res = await postService.getUserPosts(userId, 1, 50);
        if (!ignore && res.data) {
          setUserPosts(res.data);
        }
      } catch {
        if (!ignore) setUserPosts([]);
      } finally {
        if (!ignore) setPostsLoading(false);
      }
    }

    loadPosts();

    return () => {
      ignore = true;
    };
  }, [userId, canViewContent]);

  if (loading) {
    return (
      <div style={styles.pageWrapper} className="has-left-sidebar animate-fade-in">
        <LeftNavSidebar onHomeClick={() => router.push('/')} onToast={showToast} />
        <Navbar onHomeClick={() => router.push('/')} />
        <main style={styles.mainContainer} className="container">
          <div style={styles.backNavRow}>
            <Link href="/" className="profile-back-btn" aria-label={t.nav.backToHome || 'Kembali ke Beranda'}>
              <span className="profile-back-icon-badge" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </span>
              <span className="profile-back-btn-label">{t.nav.backToHome || 'Kembali ke Beranda'}</span>
            </Link>
          </div>
          <div style={styles.skeletonHeroCard} className="skeleton-shimmer" />
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.pageWrapper} className="has-left-sidebar animate-fade-in">
        <LeftNavSidebar onHomeClick={() => router.push('/')} onToast={showToast} />
        <Navbar onHomeClick={() => router.push('/')} />
        <main style={styles.mainContainer} className="container">
          <div style={styles.backNavRow}>
            <Link href="/" className="profile-back-btn" aria-label={t.nav.backToHome || 'Kembali ke Beranda'}>
              <span className="profile-back-icon-badge" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </span>
              <span className="profile-back-btn-label">{t.nav.backToHome || 'Kembali ke Beranda'}</span>
            </Link>
          </div>
          <ErrorState
            title="Pengguna Tidak Ditemukan"
            message={error || 'Profil yang Anda cari tidak tersedia.'}
            onRetry={() => window.location.reload()}
            retryLabel="Muat Ulang"
          />
        </main>
      </div>
    );
  }

  const avatarSrc = !avatarError && profile.avatar_url ? uploadService.getImageUrl(profile.avatar_url) : null;
  const username = profile.username || 'user';
  const bio = profile.bio?.trim() || t.profile.noBio;
  const joinedDate = profile.created_at
    ? new Date(profile.created_at.replace(' ', 'T')).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : '2026';

  const storiesCount = profile.stats?.stories_count ?? userPosts.length;
  const followersCount = profile.stats?.followers_count ?? 0;
  const followingCount = profile.stats?.following_count ?? 0;
  const likesCount = profile.stats?.likes_count ?? 0;

  return (
    <div style={styles.pageWrapper} className="has-left-sidebar animate-fade-in">
      <style>{`
        @media (max-width: 640px) {
          .profile-header-layout {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 1.25rem !important;
          }
          .profile-info-col {
            align-items: center !important;
            width: 100% !important;
          }
          .profile-username-action-row {
            flex-direction: column !important;
            align-items: center !important;
            gap: 0.85rem !important;
          }
          .profile-top-actions {
            justify-content: center !important;
            width: 100% !important;
          }
        }
      `}</style>
      <Toast message={toastMessage} />

      <LeftNavSidebar
        onHomeClick={() => router.push('/')}
        onToast={showToast}
        onUserClick={(selectedId) => {
          if (selectedId === authUser?.id) {
            router.push('/profile');
          } else {
            router.push(`/profile/${selectedId}`);
          }
        }}
      />

      <Navbar
        onHomeClick={() => router.push('/')}
        onThemeToggled={(newTheme) => showToast(`Beralih ke mode ${newTheme}`)}
      />

      <main style={styles.mainContainer} className="container">
        {/* Navigation Breadcrumb */}
        <div style={styles.backNavRow}>
          <Link href="/" className="profile-back-btn" aria-label={t.nav.backToHome || 'Kembali ke Beranda'}>
            <span className="profile-back-icon-badge" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </span>
            <span className="profile-back-btn-label">{t.nav.backToHome || 'Kembali ke Beranda'}</span>
          </Link>
        </div>

        {/* Profile Card Container - Modern Discord/Twitter Banner Layout */}
        <div style={styles.profileHeroCard} className="glass">
          {/* Top Banner Cover Photo */}
          <div
            style={{
              ...styles.coverBanner,
              background: getBannerBackground(profile.banner_url),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div style={styles.bannerOverlay} />
          </div>

          {/* Profile Details Header */}
          <div style={styles.profileContentArea}>
            <div className="profile-header-layout" style={styles.headerLayout}>
              {/* Left Column: Avatar */}
              <div style={styles.avatarCol}>
                <div className="story-avatar-wrap" style={styles.largeAvatarWrap}>
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
              </div>

              {/* Right Column: Profile Info & Actions */}
              <div className="profile-info-col" style={styles.infoCol}>
                {/* Username & Action Buttons Row */}
                <div className="profile-username-action-row" style={styles.usernameActionRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={styles.profileUsername}>@{username}</h1>
                    {isPrivate && (
                      <span
                        title="Akun Bersifat Privat"
                        style={styles.privateBadge}
                      >
                        🔒 Privat
                      </span>
                    )}
                  </div>

                  {/* Action Buttons Row (FollowButton & Share) */}
                  <div className="profile-top-actions" style={styles.topActionsRow}>
                    {relationship && (
                      <FollowButton
                        targetUserId={userId}
                        targetUsername={username}
                        initialRelationship={relationship}
                        onRelationshipChange={(updated) => {
                          setRelationship(updated);
                          // Refresh profile stats dynamically
                          authService.getUserProfileById(userId).then((fresh) => {
                            if (fresh) setProfile(fresh);
                          }).catch(() => {});
                        }}
                        style={{
                          padding: '0.65rem 1.4rem',
                          borderRadius: '12px',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      />
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={styles.actionBtn}
                      onClick={() => {
                        const url = window.location.href;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(url).then(() => {
                            showToast('Tautan profil berhasil disalin ke clipboard!');
                          }).catch(() => {});
                        } else {
                          showToast(`Profil @${username} siap dibagikan!`);
                        }
                      }}
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
                  </div>
                </div>

                {/* Profile Bio & Metadata */}
                <div style={styles.userInfoSection}>
                  {profile.email && (
                    <p style={styles.userEmailText}>{profile.email}</p>
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
              </div>
            </div>

            {/* Engagement Metrics Bar */}
            <div style={styles.metricsBar}>
              <div style={styles.metricCard}>
                <strong style={styles.metricNumber}>{storiesCount}</strong>
                <span style={styles.metricLabel}>{t.profile.storiesCount || 'Cerita'}</span>
              </div>

              <div style={styles.metricDivider} />

              <div
                style={{ ...styles.metricCard, cursor: 'pointer' }}
                onClick={() => setFollowListModalTab('followers')}
                title="Lihat Daftar Pengikut"
              >
                <strong style={styles.metricNumber}>{followersCount}</strong>
                <span style={{ ...styles.metricLabel, color: 'var(--social-blue)' }}>{t.follow.followers}</span>
              </div>

              <div style={styles.metricDivider} />

              <div
                style={{ ...styles.metricCard, cursor: 'pointer' }}
                onClick={() => setFollowListModalTab('following')}
                title="Lihat Daftar Mengikuti"
              >
                <strong style={styles.metricNumber}>{followingCount}</strong>
                <span style={{ ...styles.metricLabel, color: 'var(--social-blue)' }}>{t.follow.following}</span>
              </div>

              <div style={styles.metricDivider} />

              <div style={styles.metricCard}>
                <strong style={styles.metricNumber}>{likesCount}</strong>
                <span style={styles.metricLabel}>Total Suka</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stories Content Grid or Private Account Locked Notice */}
        <section style={styles.storiesGridSection}>
          {!canViewContent ? (
            <PrivateAccountLocked style={{ margin: '1rem 0 3rem', width: '100%' }} />
          ) : (
            <>
              {/* Tab Header for Public / Permitted Profile */}
              <div style={styles.tabsContainer}>
                <div style={{ ...styles.tabBtn, borderBottomColor: 'var(--social-blue)', color: 'var(--heading-color)', fontWeight: 700 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                  <span>Cerita Publik ({userPosts.length})</span>
                </div>
              </div>

              {postsLoading ? (
                <div style={styles.loadingGrid}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton-shimmer" style={styles.skeletonGridCard} />
                  ))}
                </div>
              ) : userPosts.length === 0 ? (
                <div style={styles.emptyCard} className="glass">
                  <div style={styles.emptyIconCircle}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--brand-coral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="12" y1="18" x2="12" y2="12"></line>
                      <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                  </div>
                  <h3 style={styles.emptyTitle}>{t.profile.noPostsYet || 'Belum Ada Cerita yang Dipublikasikan'}</h3>
                  <p style={styles.emptySubtitle}>Pengguna ini belum membagikan cerita publik apa pun.</p>
                </div>
              ) : (
                <div style={styles.storiesGrid}>
                  {userPosts.map((post) => {
                    const cover = (post.media && post.media.length > 0)
                      ? post.media[0].file_path
                      : (post.file_path || post.filepath);
                    const coverUrl = cover ? uploadService.getImageUrl(cover) : null;
                    const isMultiMedia = Boolean(post.media && post.media.length > 1);

                    return (
                      <div
                        key={post.id}
                        style={styles.storyCardLink}
                        className="glass glass-interactive"
                        onClick={() => {
                          setCommentDrawerPost(post);
                          setIsCommentDrawerOpen(true);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setCommentDrawerPost(post);
                            setIsCommentDrawerOpen(true);
                          }
                        }}
                      >
                        <div style={styles.storyMediaWrapper}>
                          {coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={coverUrl}
                              alt={post.post_title}
                              style={styles.storyCardImg}
                              loading="lazy"
                            />
                          ) : (
                            <div style={styles.storyTextCover}>
                              <span style={styles.storyTextTeaser}>{post.post_title}</span>
                            </div>
                          )}

                          {isMultiMedia && (
                            <div style={styles.multiPhotoBadge} title="Postingan Carousel (Multi-Foto)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="8" y="2" width="14" height="14" rx="2" ry="2"></rect>
                                <path d="M4 8H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"></path>
                              </svg>
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
                            {post.created_at
                              ? new Date(post.created_at.replace(' ', 'T')).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                })
                              : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Followers & Following List Modal */}
      {followListModalTab && (
        <FollowListModal
          isOpen={true}
          userId={userId}
          username={username}
          initialTab={followListModalTab}
          onClose={() => setFollowListModalTab(null)}
          onUserSelect={(targetId) => {
            setFollowListModalTab(null);
            if (targetId === authUser?.id) {
              router.push('/profile');
            } else {
              router.push(`/profile/${targetId}`);
            }
          }}
        />
      )}

      {/* Comment Drawer for Viewing Story Details seamlessly */}
      <CommentDrawer
        post={commentDrawerPost}
        isOpen={isCommentDrawerOpen}
        onClose={() => setIsCommentDrawerOpen(false)}
        onToast={showToast}
        savedPostIds={[]}
        onLikeToggled={(postId, newIsLiked) => {
          setUserPosts((prev) =>
            prev.map((p) => (p.id === postId ? { ...p, is_liked: newIsLiked } : p)),
          );
        }}
        onBookmarkToggled={() => {}}
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
    backgroundColor: 'var(--bg-main)',
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
  skeletonHeroCard: {
    width: '100%',
    height: '380px',
    borderRadius: 'var(--radius-xl, 24px)',
    border: '1px solid var(--border)',
  },
  profileHeroCard: {
    borderRadius: 'var(--radius-xl, 24px)',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: '2rem',
    border: '1px solid var(--border)',
  },
  coverBanner: {
    height: '210px',
    width: '100%',
    position: 'relative',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  bannerOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.5) 100%)',
  },
  profileContentArea: {
    padding: '0 2.2rem 2.2rem',
    position: 'relative',
  },
  headerLayout: {
    display: 'flex',
    gap: '2.2rem',
    alignItems: 'flex-start',
    marginBottom: '1.75rem',
  },
  avatarCol: {
    flexShrink: 0,
    marginTop: '-58px',
    zIndex: 5,
  },
  infoCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    paddingTop: '0.85rem',
  },
  usernameActionRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  privateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '9999px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    color: 'var(--brand-coral, #FF5A36)',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  largeAvatarWrap: {
    width: '120px',
    height: '120px',
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
    borderRadius: '12px',
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
    fontFamily: 'var(--font-outfit)',
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
    borderRadius: 'var(--radius-lg, 16px)',
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
    fontFamily: 'var(--font-outfit)',
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.92rem',
    cursor: 'default',
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
    borderRadius: 'var(--radius-lg, 16px)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'var(--transition)',
    textDecoration: 'none',
    cursor: 'pointer',
    border: '1px solid var(--border)',
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
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '1.05rem',
  },
  multiPhotoBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(4px)',
    borderRadius: '6px',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  storyCardInfo: {
    padding: '0.85rem 1rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  storyCardTitle: {
    fontSize: '0.94rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    margin: 0,
    lineHeight: 1.35,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  storyCardDate: {
    fontSize: '0.75rem',
    color: 'var(--fg-muted)',
    fontWeight: 500,
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.25rem',
  },
  skeletonGridCard: {
    height: '240px',
    borderRadius: 'var(--radius-lg, 16px)',
  },
  emptyCard: {
    padding: '4rem 2rem',
    borderRadius: 'var(--radius-xl, 24px)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    border: '1px solid var(--border)',
  },
  emptyIconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 90, 54, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  },
  emptyTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--heading-color)',
    margin: 0,
    fontFamily: 'var(--font-outfit)',
  },
  emptySubtitle: {
    fontSize: '0.88rem',
    color: 'var(--fg-muted)',
    maxWidth: '420px',
    margin: 0,
    lineHeight: 1.5,
  },
};
