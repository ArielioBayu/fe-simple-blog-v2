"use client";

import React from 'react';
import { useAuth } from '@/context';
import { uploadService } from '@/services';

interface FeedSidebarProps {
  userStoriesCount: number;
  savedStoriesCount: number;
  likedStoriesCount: number;
  tags: string[];
  activeTag: string;
  onSelectTag: (tag: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditProfile?: () => void;
  onOpenProfile?: () => void;
}

export function FeedSidebar({
  userStoriesCount,
  savedStoriesCount,
  likedStoriesCount,
  tags,
  activeTag,
  onSelectTag,
  onOpenCreateModal,
  onOpenEditProfile,
  onOpenProfile,
}: FeedSidebarProps) {
  const { user } = useAuth();
  const username = user?.username || 'Creator';
  const bio = user?.bio || 'Creator & Storyteller on SimpleBlog';
  const avatarSrc = user?.avatar_url ? uploadService.getImageUrl(user.avatar_url) : null;
  const bannerSrc = user?.banner_url ? uploadService.getImageUrl(user.banner_url) : null;

  // Real stats from backend (or fallback to calculated)
  const storiesCount = user?.stats?.stories_count !== undefined ? user.stats.stories_count : userStoriesCount;
  const likesCount = user?.stats?.likes_count !== undefined ? user.stats.likes_count : likedStoriesCount;

  const handleProfileClick = onOpenProfile || onOpenEditProfile;

  return (
    <aside style={styles.sidebarColumn}>
      {/* User Profile Card */}
      <div style={styles.profileCard} className="glass">
        <div
          style={{
            ...styles.profileHeaderBg,
            backgroundImage: bannerSrc ? `url(${bannerSrc})` : 'var(--ig-gradient)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div style={styles.profileContent}>
          <div
            className="story-avatar-wrap"
            style={{ width: '68px', height: '68px', marginTop: '-34px', cursor: handleProfileClick ? 'pointer' : 'default' }}
            onClick={handleProfileClick}
            title={handleProfileClick ? 'Lihat Profil' : undefined}
          >
            <div className="story-avatar-inner">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={styles.profileAvatarLetter}>
                  {username.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <h4 style={styles.profileName}>@{username}</h4>
          <p style={styles.profileBio}>{bio}</p>

          <div style={styles.profileStats}>
            <div style={styles.statItem}>
              <strong style={styles.statNumber}>{storiesCount}</strong>
              <span style={styles.statLabel}>Stories</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.statItem}>
              <strong style={styles.statNumber}>{savedStoriesCount}</strong>
              <span style={styles.statLabel}>Saved</span>
            </div>
            <div style={styles.statDivider}></div>
            <div style={styles.statItem}>
              <strong style={styles.statNumber}>{likesCount}</strong>
              <span style={styles.statLabel}>Likes</span>
            </div>
          </div>

          <div style={styles.profileButtonGroup}>
            <button
              className="btn btn-primary"
              style={styles.actionBtn}
              onClick={onOpenCreateModal}
            >
              + Write Story
            </button>
            {handleProfileClick && (
              <button
                className="btn btn-secondary"
                style={styles.actionBtn}
                onClick={handleProfileClick}
                title="Lihat Detail Profil"
              >
                Lihat Profil
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trending Hashtags Explorer */}
      <div style={styles.trendingCard} className="glass">
        <div style={styles.trendingHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ig-primary)" strokeWidth="2.5">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--heading-color)' }}>Trending Tags</h4>
        </div>

        <div style={styles.trendingList}>
          {tags.length > 0 ? (
            tags.slice(0, 8).map((tag, idx) => {
              const isSelected = activeTag === tag.toLowerCase();
              return (
                <button
                  key={idx}
                  style={{
                    ...styles.trendingTagItem,
                    borderColor: isSelected ? 'var(--ig-primary)' : 'var(--border)',
                    backgroundColor: isSelected ? 'var(--tag-bg)' : 'var(--btn-secondary-bg)',
                    color: isSelected ? 'var(--ig-primary)' : 'var(--fg-muted)',
                  }}
                  onClick={() => onSelectTag(isSelected ? 'all' : tag.toLowerCase())}
                >
                  <span>#{tag}</span>
                  <span style={styles.trendDot}>•</span>
                </button>
              );
            })
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--fg-subtle)' }}>No trending tags yet</p>
          )}
        </div>
      </div>

      {/* Community & Creation Tips */}
      <div style={styles.tipsCard} className="glass">
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--heading-color)' }}>
          <span>💡</span> Creator Best Practices
        </h4>
        <ul style={styles.tipsList}>
          <li>Give your story a clear and catchy title.</li>
          <li>Tag relevant keywords to help people discover it.</li>
          <li>Like and comment to foster inspiring conversations.</li>
        </ul>
      </div>

      {/* Subtle Footer */}
      <footer style={styles.sidebarFooter}>
        <p>© 2026 SimpleBlog • Instagram-inspired Modular Community</p>
      </footer>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebarColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  profileCard: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  profileHeaderBg: {
    height: '75px',
    background: 'var(--ig-gradient)',
    opacity: 0.9,
  },
  profileContent: {
    padding: '0 1.5rem 1.5rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  profileAvatarLetter: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  profileName: {
    fontSize: '1.15rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
    marginTop: '0.65rem',
  },
  profileBio: {
    fontSize: '0.82rem',
    color: 'var(--fg-subtle)',
    marginTop: '0.25rem',
    lineHeight: 1.4,
    maxWidth: '90%',
  },
  profileStats: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: '1.25rem',
    padding: '0.75rem 0',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.15rem',
  },
  statNumber: {
    fontSize: '1rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  statLabel: {
    fontSize: '0.72rem',
    color: 'var(--fg-subtle)',
  },
  statDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'var(--border)',
  },
  profileButtonGroup: {
    display: 'flex',
    gap: '0.65rem',
    width: '100%',
    marginTop: '1.25rem',
  },
  actionBtn: {
    flex: 1,
    padding: '0.65rem 0.5rem',
    fontSize: '0.82rem',
  },
  trendingCard: {
    borderRadius: 'var(--radius-lg)',
    padding: '1.35rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  trendingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  trendingList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  trendingTagItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.85rem',
    borderRadius: 'var(--radius-full)',
    border: '1px solid var(--border)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'var(--transition)',
  },
  trendDot: {
    fontSize: '0.65rem',
    opacity: 0.5,
  },
  tipsCard: {
    borderRadius: 'var(--radius-lg)',
    padding: '1.35rem',
  },
  tipsList: {
    paddingLeft: '1.25rem',
    fontSize: '0.82rem',
    color: 'var(--fg-muted)',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sidebarFooter: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'var(--fg-subtle)',
    padding: '0.5rem 1rem',
  },
};
