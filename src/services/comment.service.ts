import { apiFetch } from '@/lib/api';
import {
  Comment,
  CommentReply,
  PaginationResponse,
  CreateCommentRequest,
  UpdateCommentRequest,
  CreateReplyRequest,
  UpdateReplyRequest,
  ApiResponse,
} from '@/types';

export interface CommentPagedResponse extends ApiResponse<Comment[]> {
  pagination?: PaginationResponse;
}

export interface ReplyPagedResponse extends ApiResponse<CommentReply[]> {
  pagination?: PaginationResponse;
}

export const commentService = {
    async createComment(
    postId: string | number,
    content: string,
  ): Promise<ApiResponse<void>> {
    const body: CreateCommentRequest = { comment_content: content };
    try {
      return await apiFetch<void>(`/posts/comments/${postId}`, {
        method: 'POST',
        body,
      });
    } catch {
      return await apiFetch<void>(`/posts/create-comment/${postId}`, {
        method: 'POST',
        body,
      });
    }
  },

  async getComments(
    postId: string | number,
    page = 1,
    limit = 10,
  ): Promise<CommentPagedResponse> {
    const res = await apiFetch<Comment[]>(
      `/posts/comments/${postId}?page=${page}&limit=${limit}`,
    ) as CommentPagedResponse;
    return res;
  },

  async updateComment(
    commentId: number,
    content: string,
  ): Promise<ApiResponse<void>> {
    const body: UpdateCommentRequest = { comment_content: content };
    return await apiFetch<void>(`/posts/comments/${commentId}`, {
      method: 'PUT',
      body,
    });
  },

  async deleteComment(commentId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/posts/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  async createReply(
    commentId: number,
    replyContent: string,
    replyToUserId?: number,
  ): Promise<ApiResponse<void>> {
    const body: CreateReplyRequest = {
      reply_content: replyContent,
      ...(replyToUserId !== undefined && { reply_to_user_id: replyToUserId }),
    };
    return await apiFetch<void>(`/comments/replies/${commentId}`, {
      method: 'POST',
      body,
    });
  },

  async getReplies(
    commentId: number,
    page = 1,
    limit = 10,
  ): Promise<ReplyPagedResponse> {
    const res = await apiFetch<CommentReply[]>(
      `/comments/replies/${commentId}?page=${page}&limit=${limit}`,
    ) as ReplyPagedResponse;
    return res;
  },

  async updateReply(
    replyId: number,
    content: string,
  ): Promise<ApiResponse<void>> {
    const body: UpdateReplyRequest = { reply_content: content };
    return await apiFetch<void>(`/comments/replies/${replyId}`, {
      method: 'PUT',
      body,
    });
  },
  
  async deleteReply(replyId: number): Promise<ApiResponse<void>> {
    return await apiFetch<void>(`/comments/replies/${replyId}`, {
      method: 'DELETE',
    });
  },
};
