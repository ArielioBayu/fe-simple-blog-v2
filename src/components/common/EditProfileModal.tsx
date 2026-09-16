"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context';
import { uploadService } from '@/services';
import { UserProfile } from '@/types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface InnerContentProps {
  user: UserProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function EditProfileModalContent({ user, onClose, onSuccess }: InnerContentProps) {
  const { updateProfile } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || '');

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock scroll & handle Escape key
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5MB');
      return;
    }

    setUploadingAvatar(true);
    setError('');

    try {
      const res = await uploadService.uploadImage(file);
      if (res.data?.file_path) {
        setAvatarUrl(res.data.file_path);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload avatar image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      await updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl.trim(),
        banner_url: bannerUrl.trim(),
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const resolvedAvatarSrc = avatarUrl ? uploadService.getImageUrl(avatarUrl) : null;

  return (
    <div
      style={styles.overlay}
      className="animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <div style={styles.card} className="glass animate-slide-up">
        {/* Header */}
        <div style={styles.header}>
          <h3 id="edit-profile-title" style={styles.title}>Edit Profile</h3>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {error && (
          <div style={styles.error} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Avatar Preview & Upload */}
          <div style={styles.avatarSection}>
            <div className="story-avatar-wrap" style={{ width: '84px', height: '84px' }}>
              <div className="story-avatar-inner">
                {resolvedAvatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedAvatarSrc}
                    alt={username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={styles.avatarInitials}>
                    {(username || 'U').substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.avatarActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="spinner" style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}></span>
                    Uploading...
                  </span>
                ) : (
                  'Change Photo'
                )}
              </button>
              {avatarUrl && (
                <button
                  type="button"
                  style={styles.removePhotoBtn}
                  onClick={() => setAvatarUrl('')}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Username */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. johndoe"
              required
              minLength={3}
            />
          </div>

          {/* Bio */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Bio / Tagline</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share something about yourself, interests, or your creator bio..."
              rows={3}
              maxLength={250}
            />
            <span style={styles.charCount}>{bio.length}/250</span>
          </div>

          {/* Banner URL (Optional) */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Banner Background Image (Optional URL)</label>
            <input
              type="text"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... or relative path"
            />
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving || uploadingAvatar}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || uploadingAvatar || !username.trim()}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditProfileModal({ isOpen, onClose, onSuccess }: EditProfileModalProps) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <EditProfileModalContent
      key={user?.id ? `${user.id}-${user.username}-${user.avatar_url || ''}` : 'new'}
      user={user}
      onClose={onClose}
      onSuccess={onSuccess}
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
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1.25rem',
    overflowY: 'auto',
  },
  card: {
    width: '100%',
    maxWidth: '500px',
    borderRadius: 'var(--radius-xl)',
    padding: '2rem',
    position: 'relative',
    boxShadow: 'var(--shadow-lg)',
    backgroundColor: 'var(--modal-bg)',
    margin: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  closeBtn: {
    background: 'var(--btn-secondary-bg)',
    border: 'none',
    color: 'var(--fg-muted)',
    width: '40px',
    height: '40px',
    minWidth: '40px',
    minHeight: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1.4rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    transition: 'var(--transition)',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#EF4444',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.86rem',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    marginBottom: '1.25rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  avatarSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--btn-secondary-bg)',
    border: '1px solid var(--border)',
  },
  avatarInitials: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: 'var(--heading-color)',
  },
  avatarActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.5rem',
  },
  removePhotoBtn: {
    background: 'transparent',
    border: 'none',
    color: '#EF4444',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
    position: 'relative',
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: 'var(--fg-main)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  charCount: {
    fontSize: '0.72rem',
    color: 'var(--fg-subtle)',
    alignSelf: 'flex-end',
    marginTop: '0.2rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.85rem',
    marginTop: '0.75rem',
  },
};
