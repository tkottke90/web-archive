import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostFile } from '@prisma/client';
import { DBClient } from '../db';
import { PostFileCreateDTO, PostFileDTO } from '../dto/post-file.dto';
import { ROUTES } from '../config';

@Injectable()
export class PostFileDao extends BaseDao<PostFile, any> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  create(postId: number, dto: PostFileCreateDTO) {
    return this.client.postFile.create({
      data: { postId, ...dto }
    });
  }

  getById(id: number) {
    return this.client.postFile.findFirst(this.idSelector(id));
  }

  toDTO(entity: PostFile): PostFileDTO {
    return {
      self: `${ROUTES.POSTS}/${entity.postId}/files/${entity.id}`,
      post: `${ROUTES.POSTS}/${entity.postId}`,
      media: `${ROUTES.POSTS}/${entity.postId}/files/${entity.id}/content`,
      encoding: entity.encoding,
      filename: entity.filename,
      original_filename: entity.original_filename,
      mime: entity.mime,
      size: entity.size,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: any): Partial<PostFile> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostFileDao', useClass: PostFileDao }]);
