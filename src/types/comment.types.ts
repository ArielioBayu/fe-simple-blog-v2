export interface Comment {
  id: number;
  user_id: number;
  username: string;
  comment_content: string;
}

export interface CreateCommentRequest {
  comment_content: string;
}
