export interface CommentReply {
  id: number;
  comment_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  reply_to_user_id?: number;
  reply_to_username?: string;
  reply_content: string;
  created_at: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  comment_content: string;
  created_at: string;
  replies_count: number;
  replies: CommentReply[];
}

// ── Pagination ──────────────────────────────────────────────
export interface PaginationResponse {
  page: number;
  limit: number;
  total_page: number;
  total_data: number;
}

// ── Request Bodies ──────────────────────────────────────────
export interface CreateCommentRequest {
  comment_content: string;
}

export interface UpdateCommentRequest {
  comment_content: string;
}

export interface CreateReplyRequest {
  reply_content: string;
  reply_to_user_id?: number;
}

export interface UpdateReplyRequest {
  reply_content: string;
}
