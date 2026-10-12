import { apiFetch, ApiResponse } from '@/lib/api';
import { SearchUserItem } from '@/types';

export const userService = {
  /**
   * Search users server-side by username or bio: GET /accounts/search
   */
  async searchUsers(
    keyword: string,
    page = 1,
    limit = 10
  ): Promise<ApiResponse<SearchUserItem[]>> {
    const query = new URLSearchParams({
      name: keyword.trim(),
      page: page.toString(),
      limit: limit.toString(),
    });
    return await apiFetch<SearchUserItem[]>(`/accounts/search?${query.toString()}`);
  },
};

// Aliases matching FE_INTEGRATION_GUIDE.md Section 5.B
export const searchUsers = (name: string, page = 1, limit = 10) =>
  userService.searchUsers(name, page, limit);
