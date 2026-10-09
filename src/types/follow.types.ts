export type FollowStatus = 'accepted' | 'pending' | 'none';

export interface FollowActionData {
  target_user_id: number;
  status: 'accepted' | 'pending';
  is_following: boolean;
  is_pending: boolean;
}

export interface RelationshipStatus {
  target_user_id: number;
  is_self: boolean;
  is_private: boolean;
  is_following: boolean;
  is_pending: boolean;
  is_followed_by: boolean;
  can_view_content: boolean;
}

export interface FollowUserItem {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_following?: boolean;
  is_followed_by?: boolean;
  followed_at?: string;
}

export interface FollowRequestItem {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  bio?: string;
  requested_at: string;
}

export interface UpdatePrivacyPayload {
  is_private: boolean;
}

export interface PrivacySettingResponse {
  is_private: boolean;
}

// Aliases matching FE_INTEGRATION_GUIDE.md
export type FollowUserData = FollowUserItem;
export type FollowRequestUser = FollowRequestItem;
export type FollowActionResponse = FollowActionData;
