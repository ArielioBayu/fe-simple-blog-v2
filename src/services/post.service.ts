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
    return await apiFetch<Post[]>(`/posts/get-all-post?pageIndex=${pageIndex}&pageSize=${pageSize}`);
  },

  async getPostById(postId: string | number): Promise<ApiResponse<PostDetailResponseData>> {
    return await apiFetch<PostDetailResponseData>(`/posts/get-post-by-id/${postId}`);
  },

  async createPost(data: CreatePostRequest): Promise<ApiResponse<void>> {
    return await apiFetch<void>('/posts/create-post', {
      method: 'POST',
      body: data,
    });
  },

  /**
   * Fetches real-time like count for a specific post.
   * Endpoint: GET /posts/like-count/:postId
   */
  async getLikeCount(postId: string | number): Promise<ApiResponse<PostLikeCountData>> {
    return await apiFetch<PostLikeCountData>(`/posts/like-count/${postId}`);
  },

  /**
   * Fetches real-time comment count for a specific post.
   * Endpoint: GET /posts/comment-count/:postId
   */
  async getCommentCount(postId: string | number): Promise<ApiResponse<PostCommentCountData>> {
    return await apiFetch<PostCommentCountData>(`/posts/comment-count/${postId}`);
  },

  /**
   * Fetches all posts created by a specific user.
   * Endpoint: GET /posts/user/:userId?pageIndex=1&pageSize=12
   */
  async getUserPosts(userId: string | number, pageIndex: number = 1, pageSize: number = 12): Promise<ApiResponse<Post[]>> {
    try {
      return await apiFetch<Post[]>(`/posts/user/${userId}?pageIndex=${pageIndex}&pageSize=${pageSize}`);
    } catch {
      // Fallback: Fetch all posts and filter by user_id
      const allRes = await this.getAllPosts(1, 100);
      const filtered = (allRes.data || []).filter(p => String(p.user_id) === String(userId));
      return {
        status: 200,
        message: 'success get user posts',
        data: filtered,
      };
    }
  },
};

