import { Route } from '@tkottke/javscript-hateos-routes';

export const API_ROOT = new Route('api');

const POSTS_ROOT = API_ROOT.createNested('post');
const POST_WITH_ID = POSTS_ROOT.createNested(':postId');
const POST_FILES = POSTS_ROOT.createNested(':postId/files');
const POST_FILE_WITH_ID = POSTS_ROOT.createNested(':postId/files/:fileId');
const POST_FILE_CONTENT = POSTS_ROOT.createNested(
  ':postId/files/:fileId/content'
);
const POST_TAG_SEARCH = POSTS_ROOT.createNested(':postId/tag-search');
const POST_TAG = POSTS_ROOT.createNested(':postId/tags/:tagId');

export const POSTS = {
  ROOT: POSTS_ROOT,
  WITH_ID: POST_WITH_ID,
  FILES: POST_FILES,
  FILES_WITH_ID: POST_FILE_WITH_ID,
  FILES_CONTENT: POST_FILE_CONTENT,
  TAG: POST_TAG,
  TAG_SEARCH: POST_TAG_SEARCH
};
