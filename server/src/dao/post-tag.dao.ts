import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostTag } from '@prisma/client';
import { DBClient } from '../db';
import { PostTagDTO } from '../dto/post-tag.dto';

@Injectable()
export class PostTagDao extends BaseDao<PostTag, any> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  toDTO(entity: PostTag): PostTagDTO {
    throw new Error('Method not implemented.');
  }
  toPersistance(entity: PostTagDTO): Partial<PostTag> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostTagDao', useClass: PostTagDao }]);
