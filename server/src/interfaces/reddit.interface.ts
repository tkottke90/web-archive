interface RedditSchema<T> {
  kind: string;
  data: T;
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
}

export type RedditPost = RedditSchema<RedditPostData>;

export type RedditListing = RedditSchema<{
  geo_filter: string;
  children: RedditPost[];
}>;

export enum RedditPostMetadataKeys {
  'SOURCE_ID' = 'SOURCE_ID',
  'PERMALINK' = 'PERMALINK',
  'OVER_18' = 'OVER_18'
}

export type RedditResponse = RedditListing[];
