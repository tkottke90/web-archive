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
  uploader_id: any;
  uploader_url: string;
  channel_id: string;
  channel_url: string;
  duration: number;
  view_count: number;
  average_rating: any;
  age_limit: number;
  webpage_url: string;
  categories: string[];
  tags: string[];
  is_live: any;
  channel: string;
  extractor: string;
  webpage_url_basename: string;
  extractor_key: string;
  playlist: any;
  playlist_index: any;
  thumbnail: string;
  display_id: string;
  requested_subtitles: any;
  format: string;
  format_id: string;
  width: number;
  height: number;
  resolution: any;
  fps: number;
  vcodec: string;
  vbr: number;
  stretched_ratio: any;
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
