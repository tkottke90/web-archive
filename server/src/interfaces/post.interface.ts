import { Post, PostFile, PostMetadata } from '@prisma/client';
import { PostTagAssociation } from './tag.interface';

export type PostWithAssociations = Post & {
  metadata: PostMetadata[];
  files: PostFile[];
  postTags: PostTagAssociation[];
};
