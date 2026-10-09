import { apiFetch, ApiResponse } from '@/lib/api';
import {
  FollowActionData,
  RelationshipStatus,
  FollowUserItem,
  FollowRequestItem,
  PrivacySettingResponse,
} from '@/types';

export const followService = {
  /**
   * Follow target user or send follow request if target is private
   * POST /users/follow/:targetUserId
   */
  async followUser(targetUserId: number): Promise<ApiResponse<FollowActionData>> {
    return await apiFetch<FollowActionData>(`/users/follow/${targetUserId}`, {
      method: 'POST',
    });
  },

  /**
   * Unfollow target user or cancel pending follow request
   * DELETE /users/follow/:targetUserId
   */
  async unfollowUser(targetUserId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/users/follow/${targetUserId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Remove follower from own follower list (kick follower)
   * DELETE /users/followers/:followerUserId
   */
  async removeFollower(followerUserId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/users/followers/${followerUserId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get pending follow requests for the authenticated user
   * GET /users/follow/requests
   */
  async getFollowRequests(page = 1, limit = 10): Promise<ApiResponse<FollowRequestItem[]>> {
    return await apiFetch<FollowRequestItem[]>(`/users/follow/requests?page=${page}&limit=${limit}`);
  },

  /**
   * Accept incoming follow request
   * POST /users/follow/requests/:followerUserId/accept
   */
  async acceptFollowRequest(followerUserId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/users/follow/requests/${followerUserId}/accept`, {
      method: 'POST',
    });
  },

  /**
   * Reject incoming follow request
   * POST /users/follow/requests/:followerUserId/reject
   */
  async rejectFollowRequest(followerUserId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/users/follow/requests/${followerUserId}/reject`, {
      method: 'POST',
    });
  },

  /**
   * Toggle account privacy (is_private)
   * PUT /accounts/privacy
   */
  async updatePrivacy(isPrivate: boolean): Promise<ApiResponse<PrivacySettingResponse>> {
    return await apiFetch<PrivacySettingResponse>('/accounts/privacy', {
      method: 'PUT',
      body: { is_private: isPrivate },
    });
  },

  /**
   * Get followers of a user (paginated, with search)
   * GET /users/:userId/followers
   */
  async getFollowers(
    userId: number,
    page = 1,
    limit = 20,
    search?: string
  ): Promise<ApiResponse<FollowUserItem[]>> {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search && search.trim()) {
      query.append('search', search.trim());
    }
    return await apiFetch<FollowUserItem[]>(`/users/${userId}/followers?${query.toString()}`);
  },

  /**
   * Get following list of a user (paginated, with search)
   * GET /users/:userId/following
   */
  async getFollowing(
    userId: number,
    page = 1,
    limit = 20,
    search?: string
  ): Promise<ApiResponse<FollowUserItem[]>> {
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search && search.trim()) {
      query.append('search', search.trim());
    }
    return await apiFetch<FollowUserItem[]>(`/users/${userId}/following?${query.toString()}`);
  },

  /**
   * Get 360 degree relationship between current viewer and target user
   * GET /users/:userId/relationship
   */
  async getRelationship(userId: number): Promise<ApiResponse<RelationshipStatus>> {
    return await apiFetch<RelationshipStatus>(`/users/${userId}/relationship`);
  },

  /**
   * Get personalized following feed
   * GET /posts/feed
   */
  async getFeedPosts<T = unknown>(page = 1, limit = 10): Promise<ApiResponse<T>> {
    return await apiFetch<T>(`/posts/feed?page=${page}&limit=${limit}`);
  },
};

// Named function exports matching Section 5.B of FE_INTEGRATION_GUIDE.md
export const followUser = (targetUserId: number) => followService.followUser(targetUserId);
export const unfollowUser = (targetUserId: number) => followService.unfollowUser(targetUserId);
export const removeFollower = (followerUserId: number) => followService.removeFollower(followerUserId);
export const fetchFollowRequests = (page = 1, limit = 10) => followService.getFollowRequests(page, limit);
export const acceptFollowRequest = (followerUserId: number) => followService.acceptFollowRequest(followerUserId);
export const rejectFollowRequest = (followerUserId: number) => followService.rejectFollowRequest(followerUserId);
export const updateAccountPrivacy = (isPrivate: boolean) => followService.updatePrivacy(isPrivate);
export const fetchFollowers = (userId: number, page = 1, limit = 20, search = '') => followService.getFollowers(userId, page, limit, search);
export const fetchFollowing = (userId: number, page = 1, limit = 20, search = '') => followService.getFollowing(userId, page, limit, search);
export const fetchRelationshipStatus = (userId: number) => followService.getRelationship(userId);
export const fetchPersonalizedFeed = <T = unknown>(page = 1, limit = 10) => followService.getFeedPosts<T>(page, limit);
