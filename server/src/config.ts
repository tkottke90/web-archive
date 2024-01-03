import path from 'path';

export const API_ROOT = '/api';

export const ROUTES = {
  POSTS: `${API_ROOT}/post`,
  TAGS: `${API_ROOT}/tags`
} as const;

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
