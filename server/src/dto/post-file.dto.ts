import { z } from 'zod';
import { BaseSchema, FuzzyNumber } from './utilities';

export const PostFileSchema = BaseSchema(
  z.object({
    id: FuzzyNumber,
    original_filename: z.string(),
    filename: z.string(),
    size: z.number(),
    mime: z.string(),
    encoding: z.string()
  })
);

export const PostFileCreateSchema = PostFileSchema.omit({
  id: true,
  post: true,
  media: true,
  createdAt: true,
  updatedAt: true,
  links: true
});

export type PostFileDTO = z.infer<typeof PostFileSchema>;
export type PostFileCreateDTO = z.infer<typeof PostFileCreateSchema>;
