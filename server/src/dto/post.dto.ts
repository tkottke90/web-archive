import { z } from 'zod';
import { BaseSchema, QueryFields } from './utilities';
import { PostMetadataCreate } from './post-metadata.dto';
import { PostFileCreateSchema } from './post-file.dto';

export const PostSchema = BaseSchema(
  z.object({
    label: z.string(),
    author: z.string(),
    source: z.string().url()
  })
);

export const PostCreateSchema = PostSchema.merge(
  z.object({
    metadata: z.array(PostMetadataCreate).optional(),
    files: z.array(PostFileCreateSchema).optional()
  })
).omit({
  self: true,
  createdAt: true,
  updatedAt: true
});

export const PostQuerySchema = QueryFields(PostSchema);

export type PostDTO = z.infer<typeof PostSchema>;
export type PostCreateDTO = z.infer<typeof PostCreateSchema>;
export type PostQueryDTO = z.infer<typeof PostQuerySchema>;
