interface RedditSchema<T> {
  kind: string;
  data: T;
}

interface MediaDetails {
  y: number;
  x: number;
  u: string;
}

export interface MediaMetadataValue {
  e: string;
  id: string;
  m: string;
  o: MediaDetails[];
  p: MediaDetails[];
  s: MediaDetails;
  status: string;
}

interface RedditPostData {
  title: string;
  subreddit_name_prefixed: string;
  selftext: string;
  selftext_html: string;
  id: string;
  author: string;
  permalink: string;
  url: string;
  is_video: boolean;
  over_18: boolean;
  media?: {
    reddit_video: {
      fallback_url: string;
    };
  };
  media_metadata?: Record<string, MediaMetadataValue>;
}

export type RedditPost = RedditSchema<RedditPostData>;

export type RedditListing = RedditSchema<{
  geo_filter: string;
  children: RedditPost[];
}>;

export enum RedditPostMetadataKeys {
  'SOURCE_ID' = 'SOURCE_ID',
  'PERMALINK' = 'PERMALINK'
}

export type RedditResponse = RedditListing[];
