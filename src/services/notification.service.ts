import { apiFetch, ApiResponse } from '@/lib/api';
import {
  NotificationItem,
  NotificationsResponse,
  UnreadCountResponse,
} from '@/types';

export const notificationService = {
  /**
   * Fetch paginated in-app notifications
   * GET /api/v1/notifications?page=:page&limit=:limit
   */
  async getNotifications(page = 1, limit = 20): Promise<NotificationsResponse> {
    const res = await apiFetch<NotificationItem[]>(
      `/notifications?page=${page}&limit=${limit}`
    );
    return {
      status: res.status,
      message: res.message,
      data: res.data || [],
      pagination: (res.pagination as unknown as NotificationsResponse['pagination']) || {
        page,
        limit,
        total_page: 1,
        total_data: res.data?.length || 0,
      },
    };
  },

  /**
   * Fetch unread notifications count for badge
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(): Promise<number> {
    const res = await apiFetch<{ unread_count: number }>('/notifications/unread-count');
    return res.data?.unread_count ?? 0;
  },

  /**
   * Mark all notifications as read
   * PUT /api/v1/notifications/read-all
   */
  async markAllAsRead(): Promise<ApiResponse<void>> {
    return await apiFetch<void>('/notifications/read-all', {
      method: 'PUT',
    });
  },

  /**
   * Mark a single notification as read by ID
   * PUT /api/v1/notifications/:id/read
   */
  async markAsRead(notificationId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },
};

// Aliases matching FE_INTEGRATION_GUIDE.md Section 5.B & Section 7
export const fetchNotifications = (page = 1, limit = 20) =>
  notificationService.getNotifications(page, limit);

export const fetchUnreadCount = () =>
  notificationService.getUnreadCount();

export const markAllNotificationsAsRead = () =>
  notificationService.markAllAsRead();

export const markNotificationAsRead = (notificationId: number) =>
  notificationService.markAsRead(notificationId);
