import { z } from 'zod';
import { BaseSchema, QueryFields } from './utilities';

export const TagSchema = BaseSchema(
  z.object({
    id: z.number(),
    label: z.string(),
    color: z.string(),
    textColor: z.string()
  })
);

export const TagCreateSchema = TagSchema.omit({
  id: true,
  self: true,
  createdAt: true,
  updatedAt: true,
  links: true
});

export const TagQuerySchema = QueryFields(TagSchema);

export type TagDTO = z.infer<typeof TagSchema>;
export type TagCreateDTO = z.infer<typeof TagCreateSchema>;
export type TagQueryDTO = z.infer<typeof TagQuerySchema>;

export const PostTag = BaseSchema(
  z.object({
    post: z.number(),
    tag: z.number(),
    value: z.string()
  })
);

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
