export interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}
