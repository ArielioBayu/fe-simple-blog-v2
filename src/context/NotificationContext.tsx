"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '@/services/notification.service';

interface NotificationContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  isDrawerOpen: boolean;
  openNotificationDrawer: () => void;
  closeNotificationDrawer: () => void;
  toggleNotificationDrawer: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const isFetchingRef = useRef(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated || !user || isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const count = await notificationService.getUnreadCount();
      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      // Silently ignore when unauthenticated / network glitch
    } finally {
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, user]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const openNotificationDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  const closeNotificationDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleNotificationDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  // Initial fetch and 30-second interval polling
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      return;
    }

    refreshUnreadCount();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, user, refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        refreshUnreadCount,
        decrementUnreadCount,
        resetUnreadCount,
        isDrawerOpen,
        openNotificationDrawer,
        closeNotificationDrawer,
        toggleNotificationDrawer,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Hook matching FE_INTEGRATION_GUIDE.md Section 5.C
export function useNotificationBadge() {
  const { unreadCount, refreshUnreadCount, decrementUnreadCount, resetUnreadCount } =
    useNotification();
  return {
    unreadCount,
    refreshCount: refreshUnreadCount,
    decrementCount: decrementUnreadCount,
    resetCount: resetUnreadCount,
  };
}
