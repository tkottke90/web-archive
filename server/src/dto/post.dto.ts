import { z } from 'zod';
import {
  BaseSchema,
  FuzzyBoolean,
  FuzzyNumber,
  FuzzyString,
  QueryFields
} from './utilities';
import { PostMetadata, PostMetadataCreate } from './post-metadata.dto';
import { PostFileCreateSchema, PostFileSchema } from './post-file.dto';
import { PostTag } from './post-tag.dto';

export const JobListItemSchema = z.object({
  job_id: z.number(),
  type: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const PostSchema = BaseSchema(
  z.object({
    id: FuzzyNumber,
    label: z.string(),
    author: z.string(),
    source: z.string().url(),
    metadata: z.array(PostMetadata).optional(),
    files: z.array(PostFileSchema).optional(),
    tags: z.array(PostTag).optional(),
    jobs: z.array(JobListItemSchema).optional()
  })
);

export const PostCreateSchema = PostSchema.merge(
  z.object({
    metadata: z.array(PostMetadataCreate.omit({ post: true })).optional(),
    files: z.array(PostFileCreateSchema).optional()
  })
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  links: true,
  jobs: true
});

export const PostQuerySchema = QueryFields(PostSchema).merge(
  z.object({
    tag: z.union([FuzzyNumber, z.array(FuzzyNumber)]).optional(),
    sourceId: z.array(FuzzyString).optional(),
    archived: FuzzyBoolean.optional(),
    keyword: FuzzyString.optional()
  })
);

export type PostDTO = z.infer<typeof PostSchema>;
export type PostCreateDTO = z.infer<typeof PostCreateSchema>;
export type PostQueryDTO = z.infer<typeof PostQuerySchema>;
