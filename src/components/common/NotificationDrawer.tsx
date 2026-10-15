"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useLanguage, useNotification } from '@/context';
import { notificationService } from '@/services/notification.service';
import { followService } from '@/services/follow.service';
import { uploadService } from '@/services/upload.service';
import { NotificationItem, NotificationType } from '@/types/notification.types';

interface NotificationDrawerProps {
  onUserClick?: (userId: number, username?: string) => void;
}

export function NotificationDrawer({ onUserClick }: NotificationDrawerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const {
    isDrawerOpen,
    closeNotificationDrawer,
    refreshUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
  } = useNotification();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [requestActionLoading, setRequestActionLoading] = useState<Record<number, boolean>>({});

  const drawerPanelRef = useRef<HTMLDivElement>(null);

  // Load initial notifications when drawer opens
  const loadNotifications = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await notificationService.getNotifications(pageNum, 20);
      const newItems = res.data || [];
      setNotifications((prev) => (append ? [...prev, ...newItems] : newItems));
      setHasMore(pageNum < (res.pagination?.total_page ?? 1));
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      loadNotifications(1, false);
      // Auto-refresh unread count
      refreshUnreadCount();
    }
  }, [isDrawerOpen, loadNotifications, refreshUnreadCount]);

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeNotificationDrawer();
      }
    };
    if (isDrawerOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, closeNotificationDrawer]);

  if (!isDrawerOpen) return null;

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      resetUnreadCount();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Click on a notification item
  const handleItemClick = async (notif: NotificationItem) => {
    // If unread, mark it as read optimistically
    if (!notif.is_read) {
      notificationService.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      decrementUnreadCount();
    }

    closeNotificationDrawer();

    // Deep linking navigation based on entity_type & type
    if (notif.type === 'comment' || notif.type === 'reply' || notif.entity_type === 'comment') {
      let preview = '';
      if (notif.message) {
        const colonIdx = notif.message.indexOf(':');
        if (colonIdx !== -1) {
          preview = notif.message.slice(colonIdx + 1).trim();
        }
      }

      const params = new URLSearchParams();
      params.set('postId', String(notif.entity_id));
      params.set('openComments', 'true');
      if (notif.actor?.username) {
        params.set('actor', notif.actor.username);
      }
      if (preview) {
        params.set('preview', preview.slice(0, 50));
      }
      if (notif.entity_type === 'comment') {
        params.set('commentId', String(notif.entity_id));
      }

      router.push(`/?${params.toString()}`);
    } else if (notif.entity_type === 'post') {
      router.push(`/?postId=${notif.entity_id}`);
    } else if (notif.entity_type === 'user') {
      if (onUserClick) {
        onUserClick(notif.actor.id, notif.actor.username);
      } else {
        router.push(`/profile/${notif.actor.username}`);
      }
    }
  };

  // Follow request accept action
  const handleAcceptRequest = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    setRequestActionLoading((prev) => ({ ...prev, [notif.id]: true }));
    try {
      await followService.acceptFollowRequest(notif.actor.id);
      notificationService.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? { ...n, is_read: true, message: t.notifications.accepted || 'Permintaan follow diterima' }
            : n
        )
      );
      decrementUnreadCount();
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setRequestActionLoading((prev) => ({ ...prev, [notif.id]: false }));
    }
  };

  // Follow request reject action
  const handleRejectRequest = async (e: React.MouseEvent, notif: NotificationItem) => {
    e.stopPropagation();
    setRequestActionLoading((prev) => ({ ...prev, [notif.id]: true }));
    try {
      await followService.rejectFollowRequest(notif.actor.id);
      notificationService.markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? { ...n, is_read: true, message: t.notifications.rejected || 'Permintaan follow ditolak' }
            : n
        )
      );
      decrementUnreadCount();
    } catch (err) {
      console.error('Failed to reject request:', err);
    } finally {
      setRequestActionLoading((prev) => ({ ...prev, [notif.id]: false }));
    }
  };

  // Helper for notification type icons & gradients
  const getNotificationIconBadge = (type: NotificationType) => {
    switch (type) {
      case 'like':
        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #FF3040 0%, #E1306C 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(225, 48, 108, 0.4)',
            }}
            className="notif-badge-pill"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        );
      case 'comment':
        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #0095F6 0%, #06B6D4 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(0, 149, 246, 0.4)',
            }}
            className="notif-badge-pill"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        );
      case 'reply':
        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(139, 92, 246, 0.4)',
            }}
            className="notif-badge-pill"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </div>
        );
      case 'follow':
        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)',
            }}
            className="notif-badge-pill"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" stroke="#FFF" strokeWidth="2.5" />
              <line x1="23" y1="11" x2="17" y2="11" stroke="#FFF" strokeWidth="2.5" />
            </svg>
          </div>
        );
      case 'follow_request':
        return (
          <div
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
            }}
            className="notif-badge-pill"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) return t.notifications.justNow || 'Baru saja';
      if (diffMin < 60) return `${diffMin} ${t.notifications.minuteAgo || 'menit lalu'}`;
      if (diffHour < 24) return `${diffHour} ${t.notifications.hourAgo || 'jam lalu'}`;
      if (diffDay < 7) return `${diffDay} ${t.notifications.dayAgo || 'hari lalu'}`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Filtered notifications
  const displayedNotifications = notifications.filter((item) => {
    if (activeTab === 'unread') {
      return !item.is_read;
    }
    return true;
  });

  const unreadCountInList = notifications.filter((n) => !n.is_read).length;

  return (
    <div
      className="notif-drawer-backdrop"
      onClick={closeNotificationDrawer}
      role="dialog"
      aria-modal="true"
      aria-label={t.notifications.title}
    >
      <div
        ref={drawerPanelRef}
        className="notif-drawer-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="notif-drawer-header">
          <div className="notif-drawer-title-area">
            <div className="notif-title-row">
              <h2 className="notif-title-text font-heading">{t.notifications.title}</h2>
              {unreadCountInList > 0 && (
                <span className="notif-unread-count-chip">{unreadCountInList}</span>
              )}
            </div>
            <p className="notif-subtitle-text">{t.notifications.subtitle}</p>
          </div>

          <div className="notif-header-actions">
            {unreadCountInList > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="notif-mark-read-btn"
                title={t.notifications.markAllAsRead}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{isMarkingAll ? '...' : t.notifications.markAllAsRead}</span>
              </button>
            )}

            <button
              type="button"
              onClick={closeNotificationDrawer}
              className="notif-close-btn"
              aria-label={t.notifications.close}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="notif-drawer-tabs">
          <button
            type="button"
            className={`notif-tab-item ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>{t.notifications.allTab}</span>
            <span className="notif-tab-count">({notifications.length})</span>
          </button>
          <button
            type="button"
            className={`notif-tab-item ${activeTab === 'unread' ? 'active' : ''}`}
            onClick={() => setActiveTab('unread')}
          >
            <span>{t.notifications.unreadTab}</span>
            {unreadCountInList > 0 && (
              <span className="notif-tab-unread-dot" />
            )}
          </button>
        </div>

        {/* Notification Stream */}
        <div className="notif-drawer-body">
          {loading ? (
            <div className="notif-skeleton-list">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="notif-skeleton-item">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-text-area">
                    <div className="skeleton-line-long" />
                    <div className="skeleton-line-short" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="notif-empty-state">
              <div className="notif-empty-icon-wrap">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <h3 className="notif-empty-title font-heading">{t.notifications.emptyTitle}</h3>
              <p className="notif-empty-desc">{t.notifications.emptyDesc}</p>
            </div>
          ) : (
            <div className="notif-items-list">
              {displayedNotifications.map((notif) => {
                const actorAvatarUrl = notif.actor.avatar_url
                  ? uploadService.getImageUrl(notif.actor.avatar_url)
                  : null;
                const isActionLoading = requestActionLoading[notif.id];

                return (
                  <div
                    key={notif.id}
                    className={`notif-item-card ${!notif.is_read ? 'unread' : ''}`}
                    onClick={() => handleItemClick(notif)}
                  >
                    {/* Actor Avatar with Type Badge */}
                    <div className="notif-actor-avatar-wrap">
                      <div className="notif-actor-avatar">
                        {actorAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={actorAvatarUrl}
                            alt={notif.actor.username}
                            className="notif-avatar-img"
                            onError={(e) => {
                              // Fallback on image error
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="notif-avatar-initials">
                            {notif.actor.username.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      {getNotificationIconBadge(notif.type)}
                    </div>

                    {/* Notification Content */}
                    <div className="notif-item-content">
                      <p className="notif-message-text">
                        <span className="notif-actor-name">
                          @{notif.actor.username}
                        </span>
                        {notif.actor.is_verified && (
                          <span className="notif-verified-badge" title="Verified Creator">
                            ✓
                          </span>
                        )}
                        <span className="notif-message-body"> {notif.message}</span>
                      </p>

                      <div className="notif-item-meta">
                        <span className="notif-timestamp">{formatTimeAgo(notif.created_at)}</span>
                        {notif.type === 'follow_request' && !notif.is_read && (
                          <span className="notif-action-tag">Aksi Dibutuhkan</span>
                        )}
                      </div>

                      {/* Direct Inline Action Buttons for Follow Requests */}
                      {notif.type === 'follow_request' && !notif.is_read && (
                        <div className="notif-request-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={(e) => handleAcceptRequest(e, notif)}
                            className="notif-btn-accept"
                          >
                            {isActionLoading ? '...' : t.notifications.accept || 'Terima'}
                          </button>
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={(e) => handleRejectRequest(e, notif)}
                            className="notif-btn-reject"
                          >
                            {isActionLoading ? '...' : t.notifications.reject || 'Tolak'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Unread Indicator Dot */}
                    {!notif.is_read && (
                      <div className="notif-unread-glow-dot" title="Belum dibaca" />
                    )}
                  </div>
                );
              })}

              {/* Load More Button */}
              {hasMore && (
                <div className="notif-load-more-wrap">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => loadNotifications(page + 1, true)}
                    className="notif-load-more-btn"
                  >
                    {loadingMore ? 'Memuat...' : 'Muat notifikasi sebelumnya'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notif-drawer-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          display: flex;
          justify-content: flex-end;
          animation: notifFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .notif-drawer-panel {
          width: 100%;
          max-width: 440px;
          height: 100%;
          background: var(--bg-main, #0F172A);
          border-left: 1px solid var(--border, rgba(255, 255, 255, 0.1));
          box-shadow: -12px 0 36px rgba(0, 0, 0, 0.35);
          display: flex;
          flex-direction: column;
          animation: notifSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes notifFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes notifSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .notif-drawer-header {
          padding: 1.25rem 1.25rem 0.85rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .notif-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .notif-title-text {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--heading-color, #FFFFFF);
          margin: 0;
          letter-spacing: -0.01em;
        }

        .notif-unread-count-chip {
          background: var(--ig-btn-gradient, linear-gradient(135deg, #FF5A36, #E1306C));
          color: #FFFFFF;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 9999px;
          box-shadow: 0 2px 6px rgba(225, 48, 108, 0.35);
        }

        .notif-subtitle-text {
          font-size: 0.8rem;
          color: var(--fg-muted, #94A3B8);
          margin: 0.25rem 0 0;
        }

        .notif-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .notif-mark-read-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: var(--btn-secondary-bg, rgba(255, 255, 255, 0.06));
          border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
          color: var(--social-blue, #0095F6);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notif-mark-read-btn:hover {
          background: rgba(0, 149, 246, 0.12);
          border-color: var(--social-blue, #0095F6);
        }

        .notif-close-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--fg-muted, #94A3B8);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notif-close-btn:hover {
          background: var(--btn-secondary-bg, rgba(255, 255, 255, 0.08));
          color: var(--heading-color, #FFFFFF);
        }

        /* Tabs */
        .notif-drawer-tabs {
          display: flex;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
          padding: 0 1.25rem;
          background: var(--bg-card, rgba(30, 41, 59, 0.4));
        }

        .notif-tab-item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.75rem 0;
          font-size: 0.85rem;
          font-weight: 600;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--fg-muted, #94A3B8);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notif-tab-item:hover {
          color: var(--heading-color, #FFFFFF);
        }

        .notif-tab-item.active {
          color: var(--social-blue, #0095F6);
          border-bottom-color: var(--social-blue, #0095F6);
        }

        .notif-tab-count {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .notif-tab-unread-dot {
          width: 6px;
          height: 6px;
          border-radius: 9999px;
          background: var(--ig-primary, #E1306C);
        }

        /* Body */
        .notif-drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 0.75rem;
        }

        /* Notification Card */
        .notif-items-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .notif-item-card {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 0.85rem;
          border-radius: 12px;
          background: var(--bg-card, rgba(30, 41, 59, 0.5));
          border: 1px solid var(--border, rgba(255, 255, 255, 0.06));
          cursor: pointer;
          position: relative;
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .notif-item-card:hover {
          background: var(--bg-card-hover, rgba(30, 41, 59, 0.85));
          border-color: var(--border-hover, rgba(225, 48, 108, 0.25));
          transform: translateY(-1px);
        }

        .notif-item-card.unread {
          background: rgba(0, 149, 246, 0.06);
          border-color: rgba(0, 149, 246, 0.22);
        }

        .notif-actor-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .notif-actor-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--btn-secondary-bg, rgba(255, 255, 255, 0.08));
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid var(--border, rgba(255, 255, 255, 0.15));
        }

        .notif-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .notif-avatar-initials {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--fg-main, #F8FAFC);
        }

        :global(.notif-badge-pill) {
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid var(--bg-main, #0F172A);
        }

        .notif-item-content {
          flex: 1;
          min-width: 0;
        }

        .notif-message-text {
          font-size: 0.84rem;
          line-height: 1.4;
          color: var(--fg-main, #F8FAFC);
          margin: 0;
          word-break: break-word;
        }

        .notif-actor-name {
          font-weight: 700;
          color: var(--heading-color, #FFFFFF);
          margin-right: 0.25rem;
        }

        .notif-verified-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 13px;
          height: 13px;
          background: var(--social-blue, #0095F6);
          color: #FFF;
          border-radius: 50%;
          font-size: 9px;
          font-weight: 900;
          margin-right: 0.35rem;
          vertical-align: middle;
        }

        .notif-message-body {
          color: var(--fg-muted, #94A3B8);
        }

        .notif-item-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.3rem;
        }

        .notif-timestamp {
          font-size: 0.72rem;
          color: var(--fg-subtle, #64748B);
        }

        .notif-action-tag {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          background: rgba(245, 158, 11, 0.15);
          color: #F59E0B;
        }

        /* Follow request actions */
        .notif-request-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.6rem;
        }

        .notif-btn-accept {
          background: var(--social-blue, #0095F6);
          color: #FFFFFF;
          border: none;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.35rem 0.85rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notif-btn-accept:hover {
          background: var(--social-blue-hover, #1877F2);
          transform: translateY(-1px);
        }

        .notif-btn-reject {
          background: var(--btn-secondary-bg, rgba(255, 255, 255, 0.08));
          color: var(--fg-main, #F8FAFC);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          font-size: 0.78rem;
          font-weight: 500;
          padding: 0.35rem 0.75rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notif-btn-reject:hover {
          background: rgba(239, 68, 68, 0.12);
          color: #EF4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .notif-unread-glow-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--social-blue, #0095F6);
          box-shadow: 0 0 8px rgba(0, 149, 246, 0.8);
          flex-shrink: 0;
          margin-top: 0.4rem;
        }

        /* Empty State */
        .notif-empty-state {
          padding: 4rem 1.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .notif-empty-icon-wrap {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: var(--btn-secondary-bg, rgba(255, 255, 255, 0.05));
          border: 1px dashed var(--border, rgba(255, 255, 255, 0.15));
          color: var(--fg-muted, #94A3B8);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .notif-empty-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--heading-color, #FFFFFF);
          margin: 0;
        }

        .notif-empty-desc {
          font-size: 0.82rem;
          color: var(--fg-muted, #94A3B8);
          max-width: 280px;
          margin: 0.4rem 0 0;
          line-height: 1.45;
        }

        /* Skeleton loader */
        .notif-skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem 0;
        }

        .notif-skeleton-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 12px;
          background: var(--bg-card, rgba(30, 41, 59, 0.3));
        }

        .skeleton-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: var(--skeleton-base, rgba(255, 255, 255, 0.06));
          animation: pulse 1.5s infinite;
        }

        .skeleton-text-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .skeleton-line-long {
          height: 12px;
          width: 75%;
          border-radius: 6px;
          background: var(--skeleton-base, rgba(255, 255, 255, 0.06));
          animation: pulse 1.5s infinite;
        }

        .skeleton-line-short {
          height: 10px;
          width: 35%;
          border-radius: 6px;
          background: var(--skeleton-base, rgba(255, 255, 255, 0.06));
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .notif-load-more-wrap {
          text-align: center;
          padding: 0.75rem 0;
        }

        .notif-load-more-btn {
          background: transparent;
          border: 1px solid var(--border, rgba(255, 255, 255, 0.12));
          color: var(--fg-muted, #94A3B8);
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.45rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .notif-load-more-btn:hover {
          color: var(--heading-color, #FFFFFF);
          background: var(--btn-secondary-bg, rgba(255, 255, 255, 0.06));
        }
      `}</style>
    </div>
  );
}
