export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface OtpResponse {
  status: number;
  message: string;
}

export interface UserStats {
  stories_count: number;
  saved_count: number;
  likes_count: number;
  followers_count: number;
  following_count: number;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  created_at: string;
  stats?: UserStats;
}

export type User = UserProfile;

export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
