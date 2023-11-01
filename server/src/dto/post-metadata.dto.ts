import { z } from 'zod';
import { BaseSchema } from './utilities';

export const PostMetadata = BaseSchema(
  z.object({
    post: z.string(),
    type: z.string(),

    name: z.string(),
    value: z.string()
  })
);

export const PostMetadataCreate = PostMetadata.omit({
  self: true,
  createdAt: true,
  updatedAt: true
});

export type PostMetadataDTO = z.infer<typeof PostMetadata>;
export type PostMatadataCreateDTO = z.infer<typeof PostMetadataCreate>;
