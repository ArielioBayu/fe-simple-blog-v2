"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useTheme } from '@/context';
import { uploadService } from '@/services';

interface LeftNavSidebarProps {
  onHomeClick?: () => void;
  onEditProfile?: () => void;
  onToast?: (message: string) => void;
}

export function LeftNavSidebar({
  onHomeClick,
  onEditProfile,
  onToast,
}: LeftNavSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isOthersMenuOpen, setIsOthersMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const othersMenuRef = useRef<HTMLDivElement>(null);
  const othersBtnRef = useRef<HTMLButtonElement>(null);

  const isHomeActive = pathname === '/';
  const isProfileActive = pathname === '/profile';

  const avatarSrc = user?.avatar_url && !avatarError ? uploadService.getImageUrl(user.avatar_url) : null;

  // Close "Others" popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        othersMenuRef.current &&
        !othersMenuRef.current.contains(e.target as Node) &&
        othersBtnRef.current &&
        !othersBtnRef.current.contains(e.target as Node)
      ) {
        setIsOthersMenuOpen(false);
      }
    }
    if (isOthersMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOthersMenuOpen]);

  const notify = (msg: string) => {
    if (onToast) {
      onToast(msg);
    }
  };

  // 1. Home Click Handler
  const handleHomeNavigation = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isHomeActive) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (onHomeClick) {
        onHomeClick();
      }
      notify('Menyegarkan beranda feed...');
    } else {
      router.push('/');
    }
  };

  // 2. Placeholder handlers for pending backend features
  const handleMessageClick = () => {
    notify('Fitur Pesan segera hadir di pembaruan backend.');
  };

  const handleSearchClick = () => {
    notify('Fitur Pencarian segera hadir di pembaruan backend.');
  };

  const handleNotificationClick = () => {
    notify('Belum ada notifikasi baru untuk saat ini.');
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  const handleThemeToggleClick = () => {
    toggleTheme();
    notify(`Beralih ke mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`);
    setIsOthersMenuOpen(false);
  };

  const handleLogout = () => {
    setIsOthersMenuOpen(false);
    logout();
    notify('Berhasil keluar dari sesi akun.');
  };

  return (
    <aside
      className="left-nav-sidebar"
      aria-label="Sidebar Navigasi Kiri"
    >
      {/* Menu Utama (Persis sesuai referensi: Home, Messages, Search, Notifications, Profile) */}
      <nav className="left-nav-menu">
        {/* 1. Home */}
        <button
          type="button"
          className={`left-nav-item ${isHomeActive ? 'active' : ''}`}
          onClick={handleHomeNavigation}
          title="Home"
          id="sidebar-home-btn"
        >
          <div className="left-nav-icon-wrap">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="left-nav-svg"
            >
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </div>
          <span className="left-nav-label">Home</span>
        </button>

        {/* 2. Messages */}
        <button
          type="button"
          className="left-nav-item"
          onClick={handleMessageClick}
          title="Messages"
          id="sidebar-messages-btn"
        >
          <div className="left-nav-icon-wrap">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="left-nav-svg"
            >
              <path d="M21.5 2L10 13" />
              <path d="M21.5 2L14.5 22L10 13L2 8.5L21.5 2Z" />
            </svg>
            {/* Red badge with counter 3 */}
            <span className="left-nav-badge">3</span>
          </div>
          <span className="left-nav-label">Messages</span>
        </button>

        {/* 3. Search */}
        <button
          type="button"
          className="left-nav-item"
          onClick={handleSearchClick}
          title="Search"
          id="sidebar-search-btn"
        >
          <div className="left-nav-icon-wrap">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="left-nav-svg"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <span className="left-nav-label">Search</span>
        </button>

        {/* 4. Notifications */}
        <button
          type="button"
          className="left-nav-item"
          onClick={handleNotificationClick}
          title="Notifications"
          id="sidebar-notifications-btn"
        >
          <div className="left-nav-icon-wrap">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="left-nav-svg"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {/* Red dot badge */}
            <span className="left-nav-dot" />
          </div>
          <span className="left-nav-label">Notifications</span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          className={`left-nav-item ${isProfileActive ? 'active' : ''}`}
          onClick={handleProfileClick}
          title="Profile"
          id="sidebar-profile-btn"
        >
          <div className="left-nav-icon-wrap">
            <div className={`left-nav-avatar-ring ${isProfileActive ? 'active-ring' : ''}`}>
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={user?.username || 'User'}
                  onError={() => setAvatarError(true)}
                  className="left-nav-avatar-img"
                />
              ) : (
                <span className="left-nav-avatar-initial">
                  {(user?.username || 'U').substring(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <span className="left-nav-label">Profile</span>
        </button>
      </nav>

      {/* Bagian Bawah: Others (Lainnya) */}
      <div className="left-nav-footer">
        {/* Popover Dropdown when Others is clicked */}
        {isOthersMenuOpen && (
          <div
            ref={othersMenuRef}
            className="left-nav-others-popover animate-popover"
            role="dialog"
            aria-label="Menu Lainnya"
          >
            <div className="left-nav-popover-header">
              <span className="left-nav-popover-user">
                @{user?.username || 'Pengguna'}
              </span>
              <span className="left-nav-popover-email">
                {user?.email || 'SimpleBlog v2'}
              </span>
            </div>

            <div className="left-nav-popover-divider" />

            <button
              type="button"
              className="left-nav-popover-item"
              onClick={handleThemeToggleClick}
            >
              <div className="left-nav-popover-icon">
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </div>
              <span>Mode {theme === 'dark' ? 'Terang' : 'Gelap'}</span>
            </button>

            {onEditProfile && (
              <button
                type="button"
                className="left-nav-popover-item"
                onClick={() => {
                  setIsOthersMenuOpen(false);
                  onEditProfile();
                }}
              >
                <div className="left-nav-popover-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <span>Edit Profil</span>
              </button>
            )}

            <button
              type="button"
              className="left-nav-popover-item"
              onClick={() => {
                setIsOthersMenuOpen(false);
                router.push('/profile');
              }}
            >
              <div className="left-nav-popover-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span>Halaman Profil</span>
            </button>

            <div className="left-nav-popover-divider" />

            <button
              type="button"
              className="left-nav-popover-item left-nav-popover-danger"
              onClick={handleLogout}
            >
              <div className="left-nav-popover-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <span>Keluar</span>
            </button>
          </div>
        )}

        {/* Button Others */}
        <button
          ref={othersBtnRef}
          type="button"
          className={`left-nav-item ${isOthersMenuOpen ? 'active' : ''}`}
          onClick={() => setIsOthersMenuOpen(prev => !prev)}
          title="Others"
          id="sidebar-others-btn"
          aria-expanded={isOthersMenuOpen}
        >
          <div className="left-nav-icon-wrap">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="left-nav-svg"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <span className="left-nav-label">Others</span>
        </button>
      </div>
    </aside>
  );
}
