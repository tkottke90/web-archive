import { z, ZodObject, ZodRawShape } from 'zod';

export const FuzzyString = z.string({ coerce: true });
export const FuzzyNumber = z.number({ coerce: true });
export const FuzzyBoolean = z.boolean({ coerce: true });
export const NumberLike = FuzzyNumber;

export const BaseSchema = <T extends ZodRawShape>(schema: ZodObject<T>) =>
  z
    .object({
      self: z.string(),
      createdAt: z.date(),
      updatedAt: z.date()
    })
    .merge(schema);

export function QueryFields<T extends ZodRawShape>(schema: ZodObject<T>) {
  const keys = Object.keys(schema.shape);

  return z
    .object({
      limit: FuzzyNumber.optional(),
      skip: FuzzyNumber.optional(),
      sort: z
        .record(z.enum(['id', ...keys]), z.enum(['ASC', 'DESC']))
        .optional()
    })
    .merge(schema.partial());
}
