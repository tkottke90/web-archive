import { z } from 'zod';
import { BaseSchema, QueryFields } from './utilities';

export const TagSchema = BaseSchema(
  z.object({
    label: z.string()
  })
);

export const TagCreateSchema = TagSchema.omit({
  self: true,
  createdAt: true,
  updatedAt: true
});

export const TagQuerySchema = QueryFields(TagSchema);

export type TagDTO = z.infer<typeof TagSchema>;
export type TagCreateDTO = z.infer<typeof TagCreateSchema>;
export type TagQueryDTO = z.infer<typeof TagQuerySchema>;

export const PostTag = BaseSchema(
  z.object({
    post: z.string(),
    tag: z.string(),
    value: z.string()
  })
).omit({ self: true });

export const PostTagCreate = PostTag.merge(
  z.object({
    tag: TagSchema.optional()
  })
).omit({
  createdAt: true,
  updatedAt: true
});

export type PostTagDTO = z.infer<typeof PostTag>;
export type PostTagCreateDTO = z.infer<typeof PostTagCreate>;
