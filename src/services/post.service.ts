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
  /**
   * Fetches paginated posts.
   * New Endpoint: GET /posts?pageIndex=1&pageSize=10
   * Legacy Fallback: GET /posts/get-all-post?pageIndex=1&pageSize=10
   */
  async getAllPosts(pageIndex: number = 1, pageSize: number = 10): Promise<ApiResponse<Post[]>> {
    try {
      return await apiFetch<Post[]>(`/posts?pageIndex=${pageIndex}&pageSize=${pageSize}`);
    } catch {
      return await apiFetch<Post[]>(`/posts/get-all-post?pageIndex=${pageIndex}&pageSize=${pageSize}`);
    }
  },

  /**
   * Fetches single post detail by ID.
   * New Endpoint: GET /posts/:postId
   * Legacy Fallback: GET /posts/get-post-by-id/:postId
   */
  async getPostById(postId: string | number): Promise<ApiResponse<PostDetailResponseData>> {
    try {
      return await apiFetch<PostDetailResponseData>(`/posts/${postId}`);
    } catch {
      return await apiFetch<PostDetailResponseData>(`/posts/get-post-by-id/${postId}`);
    }
  },

  /**
   * Creates a new blog story / post.
   * New Endpoint: POST /posts
   * Legacy Fallback: POST /posts/create-post
   */
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

  /**
   * Fetches real-time like count for a specific post.
   * Endpoint: GET /posts/like-count/:postId (Alias: /posts/count-like/:postId)
   */
  async getLikeCount(postId: string | number): Promise<ApiResponse<PostLikeCountData>> {
    try {
      return await apiFetch<PostLikeCountData>(`/posts/like-count/${postId}`);
    } catch {
      return await apiFetch<PostLikeCountData>(`/posts/count-like/${postId}`);
    }
  },

  /**
   * Fetches real-time comment count for a specific post.
   * Endpoint: GET /posts/comment-count/:postId (Alias: /posts/count-comment/:postId)
   */
  async getCommentCount(postId: string | number): Promise<ApiResponse<PostCommentCountData>> {
    try {
      return await apiFetch<PostCommentCountData>(`/posts/comment-count/${postId}`);
    } catch {
      return await apiFetch<PostCommentCountData>(`/posts/count-comment/${postId}`);
    }
  },

  /**
   * Fetches all posts created by a specific user.
   * New Endpoint: GET /posts/user/:userId?pageIndex=1&pageSize=12
   * Fallback 1: GET /users/:userId/posts
   * Fallback 2: Client-side filter of getAllPosts
   */
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

  /**
   * Deletes a post owned by the authenticated user.
   * Endpoint: DELETE /posts/:postId
   */
  async deletePost(postId: string | number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/posts/${postId}`, {
      method: 'DELETE',
    });
  },
};

