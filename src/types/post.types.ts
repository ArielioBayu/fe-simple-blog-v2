import { Comment } from './comment.types';

export interface Post {
  id: number;
  user_id: number;
  username: string;
  post_title: string;
  post_content: string;
  post_hashtags: string[];
  is_liked: boolean;
  created_at: string;
}

export interface PostDetail {
  id: number;
  user_id: number;
  username: string;
  post_title: string;
  post_content: string;
  post_hashtags: string[];
  is_liked: boolean;
  created_at: string;
}

export interface PostDetailResponseData {
  detail_post: PostDetail;
  liked_count: number;
  comments: Comment[] | null;
}

export interface PostLikeCountData {
  post_id: number;
  like_count: number;
}

export interface PostCommentCountData {
  post_id: number;
  comment_count: number;
}

export interface CreatePostRequest {
  post_title: string;
  post_content: string;
  post_hashtags: string[];
}

export interface ActivityRequest {
  is_liked: boolean;
}
