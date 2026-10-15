export type NotificationType = 'like' | 'comment' | 'reply' | 'follow' | 'follow_request';
export type EntityType = 'post' | 'comment' | 'user';

export interface NotificationActor {
  id: number;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
}

export interface NotificationItem {
  id: number;
  type: NotificationType;
  actor: NotificationActor;
  entity_type: EntityType;
  entity_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total_page: number;
  total_data: number;
}

export interface NotificationsResponse {
  status: number;
  message: string;
  data: NotificationItem[];
  pagination: NotificationPagination;
}

export interface UnreadCountResponse {
  status: number;
  message: string;
  data: {
    unread_count: number;
  };
}
