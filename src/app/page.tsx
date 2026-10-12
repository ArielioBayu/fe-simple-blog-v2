"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useLanguage } from '@/context';
import { postService, activityService, bookmarkService, followService } from '@/services';
import {
  Navbar,
  Toast,
  StoryBar,
  PostCard,
  CreatePostModal,
  FeedSidebar,
  EditProfileModal,
  UserProfileModal,
  FollowListModal,
  FeedSkeletonList,
  PostSkeleton,
  EmptyFeedState,
  ErrorState,
  MobileBottomNav,
  LeftNavSidebar,
  CommentDrawer,
  Background3D,
} from '@/components';
import { Post, CreatePostRequest } from '@/types';

export default function FeedPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedMode, setFeedMode] = useState<'explore' | 'following'>('explore');
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Ref sentinel for IntersectionObserver infinite scrolling
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Filtering by hashtag
  const [activeTag, setActiveTag] = useState<string>('all');

  // Modal & interactions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | undefined>(undefined);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [followListModalTab, setFollowListModalTab] = useState<'followers' | 'following' | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [animatingPostId, setAnimatingPostId] = useState<number | null>(null);

  // Comment Drawer state
  const [commentDrawerPost, setCommentDrawerPost] = useState<Post | null>(null);
  const [isCommentDrawerOpen, setIsCommentDrawerOpen] = useState(false);

  const handleOpenCommentDrawer = (post: Post) => {
    setCommentDrawerPost(post);
    setIsCommentDrawerOpen(true);
  };

  const handleCloseCommentDrawer = () => {
    setIsCommentDrawerOpen(false);
  };

  // Real-time comment counts map (synced instantly with CommentDrawer)
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  const handleCommentCountLoaded = useCallback((postId: number, count: number) => {
    setCommentCounts((prev) => {
      if (prev[postId] === undefined) {
        return { ...prev, [postId]: count };
      }
      return prev;
    });
  }, []);

  const handleCommentCountChange = useCallback((postId: number, delta: number) => {
    setCommentCounts((prev) => {
      const current = prev[postId] ?? 0;
      return { ...prev, [postId]: Math.max(0, current + delta) };
    });
  }, []);

  const handleCommentCountSync = useCallback((postId: number, exactCount: number) => {
    setCommentCounts((prev) => ({ ...prev, [postId]: exactCount }));
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleOpenUserProfile = (userId: number, username?: string) => {
    setTargetUserId(userId);
    setTargetUsername(username);
    setIsUserProfileOpen(true);
  };

  // Auth guard & saved bookmarks loader from real Backend API
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      router.replace('/login');
      return;
    }

    async function loadSavedPostIds() {
      try {
        const res = await bookmarkService.getSavedPostIds();
        if (res && res.data && Array.isArray(res.data)) {
          setSavedPostIds(res.data);
          try {
            localStorage.setItem('saved_posts', JSON.stringify(res.data));
          } catch {
            // ignore
          }
          return;
        }
      } catch {
        // Fallback to localStorage if network issue
        try {
          const saved = localStorage.getItem('saved_posts');
          if (saved) {
            setSavedPostIds(JSON.parse(saved));
          }
        } catch {
          // ignore
        }
      }
    }

    if (user) {
      loadSavedPostIds();
    }
  }, [authLoading, isAuthenticated, user, router]);


  // 1. Initial Load when feedMode changes or on initial mount
  useEffect(() => {
    let ignore = false;
    if (!user) return;

    async function loadInitialPosts() {
      setLoading(true);
      setError('');
      setPage(1);

      try {
        let res: { data?: Post[] };
        if (feedMode === 'following') {
          try {
            res = (await followService.getFeedPosts<Post[]>(1, limit)) as { data?: Post[] };
          } catch {
            res = await postService.getAllPosts(1, limit);
          }
        } else {
          res = await postService.getAllPosts(1, limit);
        }

        if (!ignore) {
          if (res && res.data && Array.isArray(res.data)) {
            setPosts(res.data);
            setHasMore(res.data.length >= limit);
          } else {
            setPosts([]);
            setHasMore(false);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Gagal memuat cerita. Silakan refresh halaman.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInitialPosts();

    return () => {
      ignore = true;
    };
  }, [user, feedMode, limit]);

  // 2. Load more posts (next batch of 5 posts) when scrolling near bottom
  const loadMorePosts = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !user) return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      // Deliberate smooth micro-loading delay (~550ms) so user perceives the elegant transition
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 550));

      const fetchPromise = (async () => {
        if (feedMode === 'following') {
          try {
            return (await followService.getFeedPosts<Post[]>(nextPage, limit)) as { data?: Post[] };
          } catch {
            return await postService.getAllPosts(nextPage, limit);
          }
        } else {
          return await postService.getAllPosts(nextPage, limit);
        }
      })();

      const [res] = await Promise.all([fetchPromise, minDelayPromise]);

      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const incoming = res.data;
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = incoming.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
        setHasMore(incoming.length >= limit);
      } else {
        setHasMore(false);
      }
    } catch {
      // Graceful degradation on network hiccup
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, user, page, feedMode, limit]);

  // 3. Setup IntersectionObserver for auto-triggering loadMorePosts
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !loadingMore) {
          loadMorePosts();
        }
      },
      {
        root: null,
        rootMargin: '120px', // Trigger as user approaches bottom so loader displays naturally
        threshold: 0.05,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMorePosts, hasMore, loading, loadingMore]);

  // 4. Refetch first page (e.g., on create post, pull-to-refresh)
  const refetchFirstPage = async () => {
    setLoading(true);
    setError('');
    setPage(1);
    try {
      let res: { data?: Post[] };
      if (feedMode === 'following') {
        try {
          res = (await followService.getFeedPosts<Post[]>(1, limit)) as { data?: Post[] };
        } catch {
          res = await postService.getAllPosts(1, limit);
        }
      } else {
        res = await postService.getAllPosts(1, limit);
      }

      if (res && res.data && Array.isArray(res.data)) {
        setPosts(res.data);
        setHasMore(res.data.length >= limit);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat cerita. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async (post: Post) => {
    const updatedIsLiked = !post.is_liked;

    if (updatedIsLiked) {
      setAnimatingPostId(post.id);
      setTimeout(() => setAnimatingPostId(null), 400);
    }

    setPosts(prev =>
      prev.map(p => (p.id === post.id ? { ...p, is_liked: updatedIsLiked } : p))
    );

    try {
      await activityService.toggleLike(post.id, updatedIsLiked);
    } catch {
      setPosts(prev =>
        prev.map(p => (p.id === post.id ? { ...p, is_liked: post.is_liked } : p))
      );
    }
  };

  const handleBookmarkToggle = async (postId: number) => {
    const isSaved = savedPostIds.includes(postId);
    const nextState = !isSaved;

    setSavedPostIds(prev =>
      nextState ? [...prev, postId] : prev.filter(id => id !== postId)
    );
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, is_saved: nextState } : p))
    );

    try {
      await bookmarkService.toggleBookmark(postId, nextState);
      showToast(nextState ? 'Disimpan ke koleksi Anda' : 'Dihapus dari koleksi tersimpan');
      try {
        const nextIds = nextState ? [...savedPostIds, postId] : savedPostIds.filter(id => id !== postId);
        localStorage.setItem('saved_posts', JSON.stringify(nextIds));
      } catch {
        // ignore
      }
    } catch {
      setSavedPostIds(prev =>
        isSaved ? [...prev, postId] : prev.filter(id => id !== postId)
      );
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, is_saved: isSaved } : p))
      );
      showToast('Gagal mengubah status simpan. Silakan coba lagi.');
    }
  };


  const handleDeletePost = async (postId: number) => {
    try {
      await postService.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Postingan berhasil dihapus.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus cerita.');
    }
  };

  const handleShare = async (postId: number, postTitle: string) => {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link berhasil disalin ke clipboard!');
        return;
      } catch {
        // ignore
      }
    }
    showToast(`Cerita "${postTitle}" siap dibagikan!`);
  };

  const handleCreatePost = async (data: CreatePostRequest) => {
    await postService.createPost(data);
    showToast('Cerita berhasil dipublikasikan!');
    setPage(1);
    await refetchFirstPage();
  };

  const filteredPosts =
    activeTag === 'all'
      ? posts
      : posts.filter(
          p => p.post_hashtags && p.post_hashtags.some(t => t.toLowerCase() === activeTag.toLowerCase())
        );

  const allTags = Array.from(new Set(posts.flatMap(p => p.post_hashtags || [])));

  const handleHomeRefresh = async () => {
    setActiveTag('all');
    if (page !== 1) {
      setPage(1);
    } else {
      await refetchFirstPage();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Beranda berhasil diperbarui.');
  };

  if (authLoading || !isAuthenticated || !user) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <div className="spinner" style={{ width: '38px', height: '38px', border: '3px solid var(--social-blue)', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={styles.appContainer} className="animate-fade-in feed-page-wrapper has-left-sidebar">
      {/* Option 1: Interactive Floating Micro-Stardust Ambient Background */}
      <Background3D />

      <Toast message={toastMessage} />

      {/* Left Navigation Sidebar */}
      <LeftNavSidebar
        onHomeClick={handleHomeRefresh}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onToast={showToast}
        onUserClick={(userId, username) => {
          setTargetUserId(userId);
          setTargetUsername(username);
          setIsUserProfileOpen(true);
        }}
      />

      <Navbar
        onCreatePost={() => setIsModalOpen(true)}
        onEditProfile={() => router.push('/profile')}
        onHomeClick={handleHomeRefresh}
        onThemeToggled={(theme) => showToast(`Switched to ${theme} mode`)}
        onUserClick={(userId, username) => {
          setTargetUserId(userId);
          setTargetUsername(username);
          setIsUserProfileOpen(true);
        }}
      />

      <main style={styles.main} className="container">
        {/* Story Bar */}
        <StoryBar
          activeTag={activeTag}
          onSelectTag={setActiveTag}
          onAddStory={() => setIsModalOpen(true)}
        />

        {/* 2-Column Grid */}
        <div style={styles.layoutGrid}>
          {/* Feed Column */}
          <div style={styles.feedColumn}>
            <div style={styles.feedHeader}>
              <div>
                <div className="feed-tabs-container" role="tablist" aria-label="Mode Feed">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={feedMode === 'explore'}
                    onClick={() => {
                      if (feedMode !== 'explore') {
                        setFeedMode('explore');
                        setPage(1);
                      }
                    }}
                    className={`feed-tab-btn ${feedMode === 'explore' ? 'active' : ''}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                    <span>{t.feed.forYou}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={feedMode === 'following'}
                    onClick={() => {
                      if (feedMode !== 'following') {
                        setFeedMode('following');
                        setPage(1);
                      }
                    }}
                    className={`feed-tab-btn ${feedMode === 'following' ? 'active' : ''}`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="11" cy="7" r="4" />
                      <polyline points="17 11 19 13 23 9" />
                    </svg>
                    <span>{t.feed.following}</span>
                  </button>
                </div>
                <p style={styles.feedSubtitle}>
                  {feedMode === 'explore'
                    ? (activeTag === 'all'
                        ? t.feed.allCaughtUp
                        : `Tag #${activeTag}`)
                    : t.feed.noFollowingPostsDesc}
                </p>
              </div>

              {activeTag !== 'all' && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}
                  onClick={() => setActiveTag('all')}
                >
                  Clear filter &times;
                </button>
              )}
            </div>

            {error && (
              <ErrorState
                title="Gagal Memuat Cerita"
                message={error}
                onRetry={refetchFirstPage}
                retryLabel="Muat Ulang Cerita"
              />
            )}

            {loading ? (
              <FeedSkeletonList count={3} />
            ) : filteredPosts.length === 0 ? (
              <EmptyFeedState
                activeTag={activeTag}
                feedMode={feedMode}
                onResetTag={() => setActiveTag('all')}
                onSwitchToExplore={() => {
                  setFeedMode('explore');
                  setPage(1);
                }}
                onCreatePost={() => setIsModalOpen(true)}
              />
            ) : (
              <div style={styles.postList}>
                {filteredPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    isSaved={savedPostIds.includes(post.id)}
                    isHeartAnimating={animatingPostId === post.id}
                    commentCountOverride={commentCounts[post.id]}
                    onCommentCountLoaded={handleCommentCountLoaded}
                    onLikeToggle={handleLikeToggle}
                    onBookmarkToggle={handleBookmarkToggle}
                    onShare={handleShare}
                    onSelectTag={setActiveTag}
                    onUserClick={handleOpenUserProfile}
                    onDeletePost={handleDeletePost}
                    onCommentClick={handleOpenCommentDrawer}
                  />
                ))}
              </div>
            )}

            {/* Infinite Scroll Sentinel, Loading More Indicator & End of Feed Marker */}
            {!loading && filteredPosts.length > 0 && (
              <div style={{ width: '100%', marginTop: '0.5rem' }}>
                {/* Sentinel monitored by IntersectionObserver */}
                <div
                  ref={loadMoreSentinelRef}
                  style={{ height: '24px', width: '100%', pointerEvents: 'none' }}
                  aria-hidden="true"
                />

                {/* Smooth Animated Skeleton & Badge while fetching next 5 posts */}
                {loadingMore && (
                  <div className="infinite-scroll-loading-container animate-fade-in-up">
                    <PostSkeleton />
                    <div className="infinite-scroll-badge">
                      <div className="infinite-scroll-spinner" />
                      <span className="infinite-scroll-text">
                        {t.feed.loadingMore || 'Memuat cerita berikutnya...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Elegant End of Feed Badge when all posts are loaded */}
                {!hasMore && !loadingMore && (
                  <div className="feed-end-marker animate-fade-in-up">
                    <div className="feed-end-badge">
                      <span className="feed-end-icon">🎉</span>
                      <div className="feed-end-info">
                        <strong className="feed-end-title">{t.feed.allCaughtUp}</strong>
                        <p className="feed-end-desc">Semua postingan telah berhasil ditampilkan</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <FeedSidebar
            userStoriesCount={posts.filter(p => p.username === user?.username).length}
            savedStoriesCount={savedPostIds.length}
            likedStoriesCount={posts.filter(p => p.is_liked).length}
            tags={allTags}
            activeTag={activeTag}
            onSelectTag={setActiveTag}
            onOpenCreateModal={() => setIsModalOpen(true)}
            onOpenProfile={() => router.push('/profile')}
            onOpenEditProfile={() => setIsEditProfileOpen(true)}
            onOpenFollowList={setFollowListModalTab}
          />
        </div>
      </main>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePost}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={() => showToast('Profile updated successfully!')}
      />

      {/* Other User Profile Preview Modal (GET /accounts/profile/:id) */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        userId={targetUserId}
        fallbackUsername={targetUsername}
        onClose={() => setIsUserProfileOpen(false)}
        onPostClick={(selectedPost) => {
          setIsUserProfileOpen(false);
          handleOpenCommentDrawer(selectedPost);
        }}
      />

      {/* Followers & Following List Modal for Logged-In User */}
      {followListModalTab && user && (
        <FollowListModal
          isOpen={true}
          userId={user.id}
          username={user.username}
          initialTab={followListModalTab}
          onClose={() => setFollowListModalTab(null)}
          onUserSelect={(targetId, targetUsername) => {
            setFollowListModalTab(null);
            handleOpenUserProfile(targetId, targetUsername);
          }}
        />
      )}

      {/* Mobile Bottom Navigation Bar (Visible only on < 768px screens) */}
      <MobileBottomNav
        user={user}
        activeTab={activeTag === 'all' ? 'home' : 'explore'}
        onHomeClick={() => {
          setActiveTag('all');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onCreateClick={() => setIsModalOpen(true)}
        onSavedClick={() => {
          if (savedPostIds.length > 0) {
            showToast(`Anda memiliki ${savedPostIds.length} cerita tersimpan.`);
          } else {
            showToast('Belum ada cerita yang Anda simpan.');
          }
        }}
        onProfileClick={() => router.push('/profile')}
      />
      {/* Comment Drawer — Instagram-style full-screen split modal */}
      <CommentDrawer
        post={commentDrawerPost}
        isOpen={isCommentDrawerOpen}
        onClose={handleCloseCommentDrawer}
        onToast={showToast}
        onCommentCountChange={handleCommentCountChange}
        onCommentCountSync={handleCommentCountSync}
        savedPostIds={savedPostIds}
        onLikeToggled={(postId, newIsLiked) => {
          setPosts(prev =>
            prev.map(p => (p.id === postId ? { ...p, is_liked: newIsLiked } : p)),
          );
          // Also update the drawer's own post reference
          setCommentDrawerPost(prev =>
            prev && prev.id === postId ? { ...prev, is_liked: newIsLiked } : prev,
          );
        }}
        onBookmarkToggled={(postId, newIsSaved) => {
          setSavedPostIds(prev =>
            newIsSaved ? [...prev.filter(id => id !== postId), postId] : prev.filter(id => id !== postId),
          );
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  main: {
    flex: 1,
    paddingTop: '1.75rem',
    paddingBottom: '4rem',
    position: 'relative',
    zIndex: 1,
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '2.5rem',
    alignItems: 'start',
  },
  feedColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  feedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  feedTitle: {
    fontSize: '1.7rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  feedSubtitle: {
    color: 'var(--fg-muted)',
    fontSize: '0.88rem',
    marginTop: '0.2rem',
  },
  postList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '4rem 0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  spinner: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    border: '3px solid var(--border)',
    borderTopColor: 'var(--ig-primary)',
  },
  emptyState: {
    padding: '3.5rem 2rem',
    borderRadius: 'var(--radius-lg)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#F87171',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.88rem',
    border: '1px solid rgba(239, 68, 68, 0.25)',
  },
};
