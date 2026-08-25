export type CmsMediaType =
  | "image"
  | "pdf"
  | "video"
  | "youtube"
  | "audio"
  | "word"
  | "excel"
  | "file";

export type CmsContentItem = {
  id: string;
  section_path: string;
  title: string;
  description: string | null;
  media_type: CmsMediaType;
  mime_type: string | null;
  file_name: string | null;
  file_size: number | null;
  storage_path: string | null;
  external_url: string | null;
  thumbnail_path: string | null;
  thumbnail_url?: string | null;
  media_url?: string | null;
  date_label: string | null;
  month_label: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
