import { apiFetch } from '@/lib/api';
import { Post, PostDetailResponseData, CreatePostRequest, ApiResponse } from '@/types';

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
};
