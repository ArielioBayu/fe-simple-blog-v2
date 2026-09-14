import { apiFetch } from '@/lib/api';
import { ActivityRequest, ApiResponse } from '@/types';

export const activityService = {
  async toggleLike(postId: string | number, isLiked: boolean): Promise<ApiResponse<void>> {
    const body: ActivityRequest = { is_liked: isLiked };
    return await apiFetch<void>(`/posts/user-activity/${postId}`, {
      method: 'POST',
      body,
    });
  },
};
