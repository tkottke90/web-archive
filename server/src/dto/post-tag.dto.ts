import { z } from 'zod';
import { BaseSchema } from './utilities';

export const PostTag = BaseSchema(
  z.object({
    post: z.string(),
    tag: z.string(),
    value: z.string()
  })
).omit({ self: true });

export const PostTagCreate = PostTag.omit({
  createdAt: true,
  updatedAt: true
});

export type PostTagDTO = z.infer<typeof PostTag>;
export type PostTagCreateDTO = z.infer<typeof PostTagCreate>;
