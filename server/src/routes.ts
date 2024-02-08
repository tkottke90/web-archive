import { Route } from '@tkottke/javscript-hateos-routes';

export const API_ROOT = new Route('api');

export const SERVER = {
  HEALTHCHECK: API_ROOT.createNested('healthcheck')
};

const POSTS_ROOT = API_ROOT.createNested('post');

export const POSTS = {
  ROOT: POSTS_ROOT,
  WITH_ID: POSTS_ROOT.createNested(':postId'),
  FILES: POSTS_ROOT.createNested(':postId/files'),
  FILES_WITH_ID: POSTS_ROOT.createNested(':postId/files/:fileId'),
  FILES_CONTENT: POSTS_ROOT.createNested(':postId/files/:fileId/content'),
  TAG: POSTS_ROOT.createNested(':postId/tags/:tagId'),
  TAG_SEARCH: POSTS_ROOT.createNested(':postId/tag-search')
};

const TAGS_ROOT = API_ROOT.createNested('tags');

export const TAGS = {
  ROOT: TAGS_ROOT,
  WITH_ID: TAGS_ROOT.createNested(':tagId')
};

const PARSERS_ROOT = API_ROOT.createNested('parsers');

export const PARSERS = {
  ROOT: PARSERS_ROOT,
  REDDIT: PARSERS_ROOT.createNested('reddit'),
  REDDIT_BULK: PARSERS_ROOT.createNested('reddit-bulk'),
  YOUTUBE: PARSERS_ROOT.createNested('youtube')
};
