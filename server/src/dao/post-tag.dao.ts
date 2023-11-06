import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostTag } from '@prisma/client';
import { DBClient } from '../db';
import { PostTagDTO } from '../dto/post-tag.dto';
import { PostTagAssociation } from '../interfaces';
import { ROUTES } from '../config';
import { TagDao } from './tag.dao';

@Injectable()
export class PostTagDao extends BaseDao<PostTag, any> {
  constructor(
    @Inject('PrismaClient') private client: DBClient,
    @Inject('TagDao') private tagDao: TagDao
  ) {
    super(client);
  }

  async create(postId: number, tagId: number) {
    return this.client.postTag.create({
      data: { postId, tagId },
      include: { tags: true }
    }) as unknown as PostTagAssociation;
  }

  async delete(postId: number, tagId: number) {
    return this.client.postTag.delete({
      where: { postId_tagId: { postId, tagId } }
    });
  }

  find(postId: number, tagId: number) {
    return this.client.postTag.findFirst({
      where: {
        postId,
        tagId
      },
      include: { tags: true }
    }) as unknown as PostTagAssociation;
  }

  toDTO(entity: PostTagAssociation): PostTagDTO {
    return {
      post: `${ROUTES.POSTS}/${entity.postId}`,
      tag: `${ROUTES.TAGS}/${entity.tagId}`,
      value: entity.tags.label,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: PostTagDTO): Partial<PostTag> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostTagDao', useClass: PostTagDao }]);
