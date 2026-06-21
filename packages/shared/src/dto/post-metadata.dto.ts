import { z } from 'zod';
import { BaseSchema, FuzzyNumber } from './utilities';

export const PostMetadata = BaseSchema(
  z.object({
    id: FuzzyNumber,
    post: z.number(),

    name: z.string(),
    value: z.string()
  })
);

export const PostMetadataCreate = PostMetadata.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  links: true
});

export type PostMetadataDTO = z.infer<typeof PostMetadata>;
export type PostMetadataCreateDTO = z.infer<typeof PostMetadataCreate>;
