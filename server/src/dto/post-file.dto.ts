import { z } from 'zod';
import { BaseSchema } from './utilities';

export const PostFileSchema = BaseSchema(
  z.object({
    post: z.string(),
    uuid: z.string().uuid(),
    label: z.string()
  })
);

export const PostFileCreateSchema = PostFileSchema.omit({
  self: true,
  uuid: true,
  createdAt: true,
  updatedAt: true
});
