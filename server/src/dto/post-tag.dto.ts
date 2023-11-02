import { z } from 'zod';
import { BaseSchema } from './utilities';

export const PostTag = BaseSchema(
  z.object({
    post: z.string(),
    tag: z.string()
  })
);

export const PostTagCreate = PostTag.omit({
  self: true,
  createdAt: true,
  updatedAt: true
});

export type PostTagDTO = z.infer<typeof PostTag>;
export type PostTagCreateDTO = z.infer<typeof PostTagCreate>;
