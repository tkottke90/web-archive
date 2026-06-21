import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostTag } from '@prisma/client';
import { DBClient } from '../db';
import { PostTagDTO } from '@web-archive/shared';
import { PostTagAssociation } from '../interfaces';
import { TagDao } from './tag.dao';
import { POSTS } from '../routes';

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

  async addOrCreateTag(
    postId: number,
    tagLabel: string,
    color = 'ccffff',
    textColor = '222'
  ) {
    let tag = await this.tagDao.getByLabel(tagLabel);

    if (!tag) {
      tag = await this.tagDao.addTag({ label: tagLabel, color, textColor });
    }

    return await this.create(postId, tag.id);
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
      post: entity.postId,
      tag: entity.tagId,
      value: entity.tags.label,

      links: {
        post: POSTS.WITH_ID.url({ postId: entity.postId }),
        removeTag: POSTS.TAG.url({ postId: entity.postId, tagId: entity.tagId })
      },

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: PostTagDTO): Partial<PostTag> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostTagDao', useClass: PostTagDao }]);
