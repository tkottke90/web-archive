import { PostTag, Tag } from '@prisma/client';

export type PostTagAssociation = PostTag & {
  tag: Tag;
};
