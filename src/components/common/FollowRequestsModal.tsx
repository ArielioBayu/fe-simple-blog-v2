"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/context';
import { followService, uploadService } from '@/services';
import { FollowRequestItem } from '@/types';

export interface FollowRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestHandled?: () => void;
  onUserSelect?: (userId: number, username: string) => void;
}

function FollowRequestsModalContent({
  onClose,
  onRequestHandled,
  onUserSelect,
}: Omit<FollowRequestsModalProps, 'isOpen'>) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [requests, setRequests] = useState<FollowRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Record<number, boolean>>({});
  const [animateOut, setAnimateOut] = useState(false);

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

  // Load requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await followService.getFollowRequests(1, 50);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memuat permintaan mengikuti.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Handle Accept
  const handleAccept = async (followerUserId: number) => {
    if (processingIds[followerUserId]) return;
    setProcessingIds((prev) => ({ ...prev, [followerUserId]: true }));

    try {
      await followService.acceptFollowRequest(followerUserId);
      setRequests((prev) => prev.filter((r) => r.user_id !== followerUserId));
      if (onRequestHandled) onRequestHandled();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Gagal menerima permintaan.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [followerUserId]: false }));
    }
  };

  // Handle Reject
  const handleReject = async (followerUserId: number) => {
    if (processingIds[followerUserId]) return;
    setProcessingIds((prev) => ({ ...prev, [followerUserId]: true }));
    setActionError(null);

    try {
      await followService.rejectFollowRequest(followerUserId);
      setRequests((prev) => prev.filter((r) => r.user_id !== followerUserId));
      if (onRequestHandled) onRequestHandled();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Gagal menolak permintaan.');
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setProcessingIds((prev) => ({ ...prev, [followerUserId]: false }));
    }
  };

  const backdropClass = `requests-modal-backdrop${animateOut ? ' out' : ''}`;
  const cardClass = `requests-modal-card${animateOut ? ' out' : ''}`;

  return (
    <>
      <style>{`
        @keyframes reqBackdropFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); }
        }
        @keyframes reqBackdropFadeOut {
          from { opacity: 1; backdrop-filter: blur(8px); }
          to { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes reqSpringIn {
          0% { opacity: 0; transform: translateY(24px) scale(0.95); }
          70% { opacity: 1; transform: translateY(-3px) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes reqSpringOut {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(16px) scale(0.96); }
        }
        .requests-modal-backdrop {
          animation: reqBackdropFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .requests-modal-backdrop.out {
          animation: reqBackdropFadeOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .requests-modal-card {
          animation: reqSpringIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .requests-modal-card.out {
          animation: reqSpringOut 0.22s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .request-item-row:hover {
          background-color: ${isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'};
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
          aria-labelledby="requests-modal-title"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '440px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: isDark ? '#141417' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)'
              : '0 25px 60px -15px rgba(0, 0, 0, 0.2), 0 10px 30px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.25rem 1.25rem 0.9rem',
              borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3
                id="requests-modal-title"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--heading-color)',
                  letterSpacing: '-0.01em',
                }}
              >
                Permintaan Mengikuti
              </h3>
              <p
                style={{
                  margin: '0.2rem 0 0',
                  fontSize: '0.8rem',
                  color: 'var(--fg-muted)',
                }}
              >
                Kelola orang yang ingin mengikuti akun privat Anda
              </p>
            </div>
            <button
              type="button"
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
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                outline: 'none',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', pointerEvents: 'none' }}>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* List Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.5rem 0',
              maxHeight: '440px',
            }}
          >
            {actionError && (
              <div
                role="alert"
                style={{
                  margin: '0.5rem 1rem',
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
              <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                          width: '40%',
                          height: '14px',
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                          marginBottom: '6px',
                        }}
                      />
                      <div
                        style={{
                          width: '60%',
                          height: '11px',
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: '130px',
                        height: '32px',
                        borderRadius: '10px',
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem', color: '#EF4444' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>{error}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={loadRequests}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
                >
                  Coba Lagi
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--fg-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--heading-color)', margin: '0 0 0.25rem' }}>
                  Tidak Ada Permintaan
                </h4>
                <p style={{ fontSize: '0.82rem', margin: 0 }}>
                  Saat pengguna meminta untuk mengikuti akun privat Anda, permintaan tersebut akan muncul di sini.
                </p>
              </div>
            ) : (
              <div>
                {requests.map((item, idx) => {
                  const targetId = item.id || item.user_id;
                  const itemAvatarUrl = item.avatar_url ? uploadService.getImageUrl(item.avatar_url) : null;
                  const isProcessing = !!(targetId && processingIds[targetId]);

                  return (
                    <div
                      key={targetId ?? `req-${item.username}-${idx}`}
                      className="request-item-row"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem',
                        transition: 'background-color 0.15s ease',
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
                            backgroundColor: isDark ? '#27272A' : '#E2E8F0',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: 'var(--fg-muted)',
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
                            item.username.substring(0, 2).toUpperCase()
                          )}
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: '0.88rem',
                              color: 'var(--heading-color)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            @{item.username}
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

                      {/* Action buttons: Accept & Reject */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleAccept(item.user_id)}
                          disabled={isProcessing}
                          className="btn btn-primary"
                          style={{
                            padding: '0.42rem 0.85rem',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {isProcessing ? '...' : 'Konfirmasi'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(item.user_id)}
                          disabled={isProcessing}
                          style={{
                            padding: '0.42rem 0.75rem',
                            borderRadius: '10px',
                            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9',
                            color: 'var(--fg-muted)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function FollowRequestsModal(props: FollowRequestsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!props.isOpen || !mounted) return null;

  return createPortal(<FollowRequestsModalContent {...props} />, document.body);
}
