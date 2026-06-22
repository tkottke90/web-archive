export interface Thumbnail {
  height: number;
  url: string;
  width: number;
  resolution: string;
  id: string;
}

export interface Format {
  asr?: number;
  filesize?: number;
  format_id: string;
  format_note: string;
  fps?: number;
  height?: number;
  quality: number;
  tbr: number;
  url: string;
  width?: number;
  ext: string;
  vcodec: string;
  acodec: string;
  abr?: number;
  container?: string;
  format: string;
  protocol: string;
  vbr?: number;
}

export interface YoutubeDetails {
  id: string;
  title: string;
  formats: Format[];
  thumbnails: Thumbnail[];
  description: string;
  upload_date: string;
  uploader: string;
  uploader_id: string | null;
  uploader_url: string;
  channel_id: string;
  channel_url: string;
  duration: number;
  view_count: number;
  average_rating: number | null;
  age_limit: number;
  webpage_url: string;
  categories: string[];
  tags: string[];
  is_live: boolean | null;
  channel: string;
  extractor: string;
  webpage_url_basename: string;
  extractor_key: string;
  playlist: string | null;
  playlist_index: number | null;
  thumbnail: string;
  display_id: string;
  requested_subtitles: unknown;
  format: string;
  format_id: string;
  width: number;
  height: number;
  resolution: string | null;
  fps: number;
  vcodec: string;
  vbr: number;
  stretched_ratio: number | null;
  acodec: string;
  abr: number;
  ext: string;
  fulltitle: string;
  _filename: string;
}

export enum YoutubePostMetadataKeys {
  'SOURCE_ID' = 'SOURCE_ID'
}

export type YoutubeJob = {
  url: string;
  path: string;
  ogFilename: string;
  postId: number;
};
