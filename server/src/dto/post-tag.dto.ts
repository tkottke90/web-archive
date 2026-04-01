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
}).merge(
  z.object({
    color: z.string().default('ccffff'),
    textColor: z.string().default('222')
  })
);

export const TagUpdateSchema = z.object({
  label: z.string().min(1).optional(),
  color: z
    .string()
    .regex(
      /^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/,
      'Must be a valid 3 or 6 digit hex color'
    )
    .optional(),
  textColor: z
    .string()
    .regex(
      /^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/,
      'Must be a valid 3 or 6 digit hex color'
    )
    .optional()
});

export const TagQuerySchema = QueryFields(TagSchema);

export type TagDTO = z.infer<typeof TagSchema>;
export type TagCreateDTO = z.infer<typeof TagCreateSchema>;
export type TagUpdateDTO = z.infer<typeof TagUpdateSchema>;
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
