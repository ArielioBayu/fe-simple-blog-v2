import { apiFetch, getMediaUrl } from '@/lib/api';
import { ApiResponse, MediaUpload } from '@/types';

export const uploadService = {
  /**
   * Upload an image file (jpg, png, webp, gif - max 5MB)
   */
  async uploadImage(file: File): Promise<ApiResponse<MediaUpload>> {
    const formData = new FormData();
    formData.append('file', file);

    return await apiFetch<MediaUpload>('/upload', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Retrieve all media files uploaded by the current user
   */
  async getMyMedia(): Promise<ApiResponse<MediaUpload[]>> {
    return await apiFetch<MediaUpload[]>('/upload/my-media', {
      method: 'GET',
    });
  },

  /**
   * Helper to format relative file_path into browser full URL
   */
  getImageUrl(filePath?: string | null): string | null {
    return getMediaUrl(filePath);
  },
};
