import { apiFetch } from '@/lib/api';
import { CreateCommentRequest, ApiResponse } from '@/types';

export const commentService = {
  async createComment(postId: string | number, content: string): Promise<ApiResponse<void>> {
    const body: CreateCommentRequest = {
      comment_content: content,
    };
    return await apiFetch<void>(`/posts/create-comment/${postId}`, {
      method: 'POST',
      body,
    });
  },
};
