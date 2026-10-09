"use client";

import React, { useState } from 'react';
import { useTheme } from '@/context';
import { RelationshipStatus } from '@/types';
import { followService } from '@/services';

export interface FollowButtonProps {
  targetUserId: number;
  targetUsername: string;
  initialRelationship: RelationshipStatus;
  onRelationshipChange?: (updated: RelationshipStatus) => void;
  onEditProfileClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  initialRelationship,
  onRelationshipChange,
  onEditProfileClick,
  className = '',
  style,
}: FollowButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [rel, setRel] = useState<RelationshipStatus>(initialRelationship);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmUnfollow, setShowConfirmUnfollow] = useState(false);

  // Sync state if prop changes
  React.useEffect(() => {
    setRel(initialRelationship);
  }, [initialRelationship]);

  // 1. Skenario Profil Sendiri
  if (rel.is_self) {
    return (
      <button
        type="button"
        onClick={onEditProfileClick}
        className={`btn btn-secondary ${className}`}
        style={{
          padding: '0.45rem 1rem',
          borderRadius: '12px',
          fontSize: '0.84rem',
          fontWeight: 600,
          ...style,
        }}
      >
        Edit Profil
      </button>
    );
  }

  // Handle Klik Follow / Follow Back
  const handleFollow = async () => {
    setIsLoading(true);
    const prevRel = { ...rel };
    const willBePending = rel.is_private;
    const nextRel: RelationshipStatus = {
      ...rel,
      is_following: !willBePending,
      is_pending: willBePending,
      can_view_content: !willBePending || rel.can_view_content,
    };
    setRel(nextRel);

    try {
      const res = await followService.followUser(targetUserId);
      const isPending = res.data?.status === 'pending';
      const updated: RelationshipStatus = {
        ...rel,
        is_following: !isPending,
        is_pending: isPending,
        can_view_content: !isPending || rel.can_view_content,
      };
      setRel(updated);
      onRelationshipChange?.(updated);
    } catch (error) {
      setRel(prevRel);
      console.error('Failed to follow user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Eksekusi Unfollow atau Batalkan Request
  const handleExecuteUnfollow = async () => {
    setShowConfirmUnfollow(false);
    setIsLoading(true);
    const prevRel = { ...rel };
    const nextRel: RelationshipStatus = {
      ...rel,
      is_following: false,
      is_pending: false,
      can_view_content: !rel.is_private,
    };
    setRel(nextRel);

    try {
      await followService.unfollowUser(targetUserId);
      onRelationshipChange?.(nextRel);
    } catch (error) {
      setRel(prevRel);
      console.error('Failed to unfollow user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Skenario Sudah Mengikuti (Following)
  if (rel.is_following) {
    return (
      <>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setShowConfirmUnfollow(true)}
          className={`btn btn-secondary ${className}`}
          style={{
            padding: '0.45rem 1.15rem',
            borderRadius: '12px',
            fontSize: '0.84rem',
            fontWeight: 600,
            color: 'var(--fg-primary)',
            ...style,
          }}
        >
          {isLoading ? '...' : 'Mengikuti'}
        </button>

        {/* Modal Konfirmasi Unfollow ala Instagram */}
        {showConfirmUnfollow && (
          <div
            className="animate-fade-in"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(8px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowConfirmUnfollow(false);
            }}
          >
            <div
              className="glass animate-slide-up"
              style={{
                width: '100%',
                maxWidth: '340px',
                borderRadius: '24px',
                padding: '1.75rem 1.5rem 1.25rem',
                textAlign: 'center',
                backgroundColor: isDark ? '#18181B' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: isDark
                  ? '0 25px 60px -15px rgba(0,0,0,0.9)'
                  : '0 25px 60px -15px rgba(0,0,0,0.15)',
              }}
            >
              <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>👋</div>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                  color: 'var(--heading-color)',
                  fontFamily: 'var(--font-outfit), sans-serif',
                }}
              >
                Berhenti mengikuti @{targetUsername}?
              </h3>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--fg-muted)',
                  margin: '0 0 1.5rem',
                  lineHeight: 1.45,
                }}
              >
                Postingan mereka tidak akan lagi muncul di feed beranda Mengikuti Anda.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleExecuteUnfollow}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    color: '#EF4444',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Batal Mengikuti
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmUnfollow(false)}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 3. Skenario Permintaan Tertunda (Requested)
  if (rel.is_pending) {
    return (
      <button
        type="button"
        disabled={isLoading}
        onClick={handleExecuteUnfollow}
        title="Klik untuk membatalkan permintaan follow"
        className={`btn btn-secondary ${className}`}
        style={{
          padding: '0.45rem 1.15rem',
          borderRadius: '12px',
          fontSize: '0.84rem',
          fontWeight: 600,
          color: 'var(--fg-muted)',
          ...style,
        }}
      >
        {isLoading ? '...' : 'Diminta'}
      </button>
    );
  }

  // 4. Skenario Diikuti oleh Target tapi Belum Follow Balik (Follow Back)
  if (rel.is_followed_by) {
    return (
      <button
        type="button"
        disabled={isLoading}
        onClick={handleFollow}
        className={`btn btn-primary ${className}`}
        style={{
          padding: '0.45rem 1.25rem',
          borderRadius: '12px',
          fontSize: '0.84rem',
          fontWeight: 700,
          ...style,
        }}
      >
        {isLoading ? '...' : 'Ikuti Balik'}
      </button>
    );
  }

  // 5. Default: Belum Mengikuti (Follow)
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={handleFollow}
      className={`btn btn-primary ${className}`}
      style={{
        padding: '0.45rem 1.25rem',
        borderRadius: '12px',
        fontSize: '0.84rem',
        fontWeight: 700,
        ...style,
      }}
    >
      {isLoading ? '...' : 'Ikuti'}
    </button>
  );
}
