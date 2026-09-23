"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context';
import { postService, activityService } from '@/services';
import {
  Navbar,
  Toast,
  StoryBar,
  PostCard,
  CreatePostModal,
  FeedSidebar,
  EditProfileModal,
  UserProfileModal,
  FeedSkeletonList,
  EmptyFeedState,
  MobileBottomNav,
  LeftNavSidebar,
} from '@/components';
import { Post, CreatePostRequest } from '@/types';

export default function FeedPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering by hashtag
  const [activeTag, setActiveTag] = useState<string>('all');

  // Modal & interactions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [targetUsername, setTargetUsername] = useState<string | undefined>(undefined);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [animatingPostId, setAnimatingPostId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleOpenUserProfile = (userId: number, username?: string) => {
    setTargetUserId(userId);
    setTargetUsername(username);
    setIsUserProfileOpen(true);
  };

  // Auth guard & saved bookmarks loader
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      router.replace('/login');
      return;
    }

    try {
      const saved = localStorage.getItem('saved_posts');
      if (saved) {
        const parsed = JSON.parse(saved);
        queueMicrotask(() => setSavedPostIds(parsed));
      }
    } catch {
      // ignore
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Fetch posts effect
  useEffect(() => {
    let ignore = false;
    if (!user) return;

    async function loadPosts() {
      try {
        const res = await postService.getAllPosts(page, limit);
        if (!ignore) {
          if (res && res.data) {
            setPosts(res.data);
            setHasMore(res.data.length === limit);
          } else {
            setPosts([]);
            setHasMore(false);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load posts.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      ignore = true;
    };
  }, [page, limit, user]);

  const refetchFirstPage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await postService.getAllPosts(1, limit);
      if (res && res.data) {
        setPosts(res.data);
        setHasMore(res.data.length === limit);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load posts.');
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

  const handleBookmarkToggle = (postId: number) => {
    setSavedPostIds(prev => {
      const isSaved = prev.includes(postId);
      const next = isSaved ? prev.filter(id => id !== postId) : [...prev, postId];
      try {
        localStorage.setItem('saved_posts', JSON.stringify(next));
      } catch {
        // ignore
      }
      showToast(isSaved ? 'Removed from saved collection' : 'Saved to your collection');
      return next;
    });
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await postService.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      showToast('Cerita berhasil dihapus.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus cerita.');
    }
  };

  const handleShare = async (postId: number, postTitle: string) => {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!');
        return;
      } catch {
        // ignore
      }
    }
    showToast(`Shared: ${postTitle}`);
  };

  const handleCreatePost = async (data: CreatePostRequest) => {
    await postService.createPost(data);
    showToast('Story published successfully!');
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
      <Toast message={toastMessage} />

      {/* Left Navigation Sidebar */}
      <LeftNavSidebar
        onHomeClick={handleHomeRefresh}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onToast={showToast}
      />

      <Navbar
        onCreatePost={() => setIsModalOpen(true)}
        onEditProfile={() => router.push('/profile')}
        onHomeClick={handleHomeRefresh}
        onThemeToggled={(theme) => showToast(`Switched to ${theme} mode`)}
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
                <h2 style={styles.feedTitle}>
                  {activeTag === 'all' ? 'Feed Stories' : `#${activeTag}`}
                </h2>
                <p style={styles.feedSubtitle}>
                  {activeTag === 'all'
                    ? 'Latest posts and articles from the community'
                    : `Showing articles tagged with #${activeTag}`}
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

            {error && <div style={styles.errorBanner}>{error}</div>}

            {loading ? (
              <FeedSkeletonList count={3} />
            ) : filteredPosts.length === 0 ? (
              <EmptyFeedState
                activeTag={activeTag}
                onResetTag={() => setActiveTag('all')}
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
                    onLikeToggle={handleLikeToggle}
                    onBookmarkToggle={handleBookmarkToggle}
                    onShare={handleShare}
                    onSelectTag={setActiveTag}
                    onUserClick={handleOpenUserProfile}
                    onDeletePost={handleDeletePost}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredPosts.length > 0 && (
              <div style={styles.pagination}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setLoading(true);
                    setPage(p => Math.max(p - 1, 1));
                  }}
                  disabled={page === 1}
                >
                  &larr; Previous Page
                </button>
                <span style={styles.pageIndicator}>Page {page}</span>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setLoading(true);
                    setPage(p => p + 1);
                  }}
                  disabled={!hasMore}
                >
                  Next Page &rarr;
                </button>
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
      />

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
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.25rem',
    marginTop: '1.5rem',
  },
  pageIndicator: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--fg-muted)',
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
