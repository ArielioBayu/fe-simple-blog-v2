export interface MediaUpload {
  id: number;
  file_name: string;
  system_filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export type UploadFileResponseData = MediaUpload;

