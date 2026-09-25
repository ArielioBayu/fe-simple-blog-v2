import { apiFetch } from '@/lib/api';
import { ApiResponse, Post, BookmarkRequest } from '@/types';

export const bookmarkService = {

  async toggleBookmark(postId: string | number, isSaved: boolean): Promise<ApiResponse<void>> {
    const body: BookmarkRequest = { is_saved: isSaved };
    try {
      return await apiFetch<void>(`/posts/bookmarks/${postId}`, {
        method: 'POST',
        body,
      });
    } catch {
      return await apiFetch<void>(`/posts/user-saved/${postId}`, {
        method: 'POST',
        body,
      });
    }
  },

  async getSavedPosts(page: number = 1, limit: number = 20): Promise<ApiResponse<Post[]>> {
    try {
      return await apiFetch<Post[]>(`/posts/bookmarks?page=${page}&limit=${limit}`);
    } catch {
      return await apiFetch<Post[]>(`/posts/saved?page=${page}&limit=${limit}`);
    }
  },

  async getSavedPostIds(): Promise<ApiResponse<number[]>> {
    try {
      return await apiFetch<number[]>('/posts/bookmarks/ids');
    } catch {
      return await apiFetch<number[]>('/posts/saved/ids');
    }
  },
};
