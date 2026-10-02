export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  limit: number;
  offset?: number;
  page?: number;
  total_page?: number;
  total_data?: number;
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}
