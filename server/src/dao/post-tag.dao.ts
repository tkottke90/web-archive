import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostTag } from '@prisma/client';
import { DBClient } from '../db';
import { PostTagDTO } from '../dto/post-tag.dto';
import { PostTagAssociation } from '../interfaces';
import { ROUTES } from '../config';

@Injectable()
export class PostTagDao extends BaseDao<PostTag, any> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  toDTO(entity: PostTagAssociation): PostTagDTO {
    return {
      post: `${ROUTES.POSTS}/${entity.postId}`,
      tag: `${ROUTES.TAGS}/${entity.tagId}`,
      value: entity.tag.label,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: PostTagDTO): Partial<PostTag> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostTagDao', useClass: PostTagDao }]);
