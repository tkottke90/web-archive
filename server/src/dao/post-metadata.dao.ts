import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostMetadata } from '@prisma/client';
import { DBClient } from '../db';
import { PostMetadataDTO } from '../dto/post-metadata.dto';
import { POSTS } from '../routes';

@Injectable()
export class PostMetadataDao extends BaseDao<PostMetadata, any> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  toDTO(entity: PostMetadata): PostMetadataDTO {
    return {
      id: entity.id,
      post: entity.postId,
      name: entity.name,
      value: entity.value,

      links: {
        post: POSTS.WITH_ID.url({ postId: entity.postId }),
        self: ''
      },

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }

  toPersistance(entity: any): Partial<PostMetadata> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostMetadataDao', useClass: PostMetadataDao }]);
