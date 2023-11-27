import path from 'path';

export const API_ROOT = '';

export const ROUTES = {
  POSTS: `${API_ROOT}/post`,
  TAGS: `${API_ROOT}/tags`
};

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
