import { apiFetch } from '@/lib/api';
import {
  Post,
  PostDetailResponseData,
  CreatePostRequest,
  PostLikeCountData,
  PostCommentCountData,
  ApiResponse,
} from '@/types';

export const postService = {
  async getAllPosts(pageIndex: number = 1, pageSize: number = 10): Promise<ApiResponse<Post[]>> {
    try {
      return await apiFetch<Post[]>(`/posts?pageIndex=${pageIndex}&pageSize=${pageSize}`);
    } catch {
      return await apiFetch<Post[]>(`/posts/get-all-post?pageIndex=${pageIndex}&pageSize=${pageSize}`);
    }
  },

  async getPostById(postId: string | number): Promise<ApiResponse<PostDetailResponseData>> {
    try {
      return await apiFetch<PostDetailResponseData>(`/posts/${postId}`);
    } catch {
      return await apiFetch<PostDetailResponseData>(`/posts/get-post-by-id/${postId}`);
    }
  },

  async createPost(data: CreatePostRequest): Promise<ApiResponse<void>> {
    try {
      return await apiFetch<void>('/posts', {
        method: 'POST',
        body: data,
      });
    } catch {
      return await apiFetch<void>('/posts/create-post', {
        method: 'POST',
        body: data,
      });
    }
  },

  async getLikeCount(postId: string | number): Promise<ApiResponse<PostLikeCountData>> {
    try {
      return await apiFetch<PostLikeCountData>(`/posts/like-count/${postId}`);
    } catch {
      return await apiFetch<PostLikeCountData>(`/posts/count-like/${postId}`);
    }
  },

  async getCommentCount(postId: string | number): Promise<ApiResponse<PostCommentCountData>> {
    try {
      return await apiFetch<PostCommentCountData>(`/posts/comments/count/${postId}`);
    } catch {
      try {
        return await apiFetch<PostCommentCountData>(`/posts/comment-count/${postId}`);
      } catch {
        return await apiFetch<PostCommentCountData>(`/posts/count-comment/${postId}`);
      }
    }
  },

  async getUserPosts(userId: string | number, pageIndex: number = 1, pageSize: number = 12): Promise<ApiResponse<Post[]>> {
    try {
      return await apiFetch<Post[]>(`/posts/user/${userId}?pageIndex=${pageIndex}&pageSize=${pageSize}`);
    } catch {
      try {
        return await apiFetch<Post[]>(`/users/${userId}/posts?pageIndex=${pageIndex}&pageSize=${pageSize}`);
      } catch {
        // Fallback: Fetch posts and filter by user_id
        const allRes = await this.getAllPosts(1, 100);
        const filtered = (allRes.data || []).filter(p => String(p.user_id) === String(userId));
        return {
          status: 200,
          message: 'success get user posts',
          data: filtered,
        };
      }
    }
  },

  async deletePost(postId: string | number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/posts/${postId}`, {
      method: 'DELETE',
    });
  },
};

