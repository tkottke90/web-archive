import { Route } from '@tkottke/hateos-url-manager';

export const API_ROOT = new Route('api');

export const SERVER = {
  HEALTHCHECK: API_ROOT.nest('healthcheck')
};

const POSTS_ROOT = API_ROOT.nest('post');
export const UI_POSTS = new Route('post/:postId');

export const POSTS = {
  ROOT: POSTS_ROOT,
  WITH_ID: POSTS_ROOT.nest(':postId'),
  NAV: POSTS_ROOT.nest(':postId/navigation'),
  FILES: POSTS_ROOT.nest(':postId/files'),
  FILES_URL: POSTS_ROOT.nest(':postId/files/url'),
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

const SYSTEM_ROOT = API_ROOT.nest('system');

export const SYSTEM = {
  ROOT: SYSTEM_ROOT,
  POST_RECOVERY: SYSTEM_ROOT.nest('post-recovery'),
  AUTO_ARCHIVE: SYSTEM_ROOT.nest('auto-archive')
};

const JOBS_ROOT = API_ROOT.nest('jobs');

export const JOBS = {
  ROOT: JOBS_ROOT
};
