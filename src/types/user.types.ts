export interface SearchUserItem {
  id: number;
  username: string;
  bio?: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_private?: boolean;
  is_following?: boolean;
}

export interface SearchUserPagination {
  page: number;
  limit: number;
  total_page: number;
  total_data: number;
}

export interface SearchUserResponse {
  status: number;
  message: string;
  data: SearchUserItem[];
  pagination: SearchUserPagination;
}
