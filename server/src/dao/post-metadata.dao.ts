import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostMetadata } from '@prisma/client';
import { DBClient } from '../db';
import { PostMetadataDTO } from '../dto/post-metadata.dto';
import { ROUTES } from '../config';

@Injectable()
export class PostMetadataDao extends BaseDao<PostMetadata, any> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  toDTO(entity: PostMetadata): PostMetadataDTO {
    const postLink = `${ROUTES.POSTS}/${entity.postId}`;

    return {
      self: `${postLink}/metadata/${entity.id}`,
      post: postLink,
      name: entity.name,
      value: entity.value,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  toPersistance(entity: any): Partial<PostMetadata> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostMetadataDao', useClass: PostMetadataDao }]);
