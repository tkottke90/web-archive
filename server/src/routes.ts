import { Route } from '@tkottke/hateos-url-manager';

export const API_ROOT = new Route('api');

export const SERVER = {
  HEALTHCHECK: API_ROOT.nest('healthcheck')
};

const POSTS_ROOT = API_ROOT.nest('post');

export const POSTS = {
  ROOT: POSTS_ROOT,
  WITH_ID: POSTS_ROOT.nest(':postId'),
  FILES: POSTS_ROOT.nest(':postId/files'),
  FILES_WITH_ID: POSTS_ROOT.nest(':postId/files/:fileId'),
  FILES_CONTENT: POSTS_ROOT.nest(':postId/files/:fileId/content'),
  TAG: POSTS_ROOT.nest(':postId/tags/:tagId'),
  TAG_SEARCH: POSTS_ROOT.nest(':postId/tag-search')
} as const;

const TAGS_ROOT = API_ROOT.nest('tags');

export const TAGS = {
  ROOT: TAGS_ROOT,
  WITH_ID: TAGS_ROOT.nest(':tagId')
};

const PARSERS_ROOT = API_ROOT.nest('parsers');

export const PARSERS = {
  ROOT: PARSERS_ROOT,
  REDDIT: PARSERS_ROOT.nest('reddit'),
  REDDIT_BULK: PARSERS_ROOT.nest('reddit-bulk'),
  YOUTUBE: PARSERS_ROOT.nest('youtube')
};
