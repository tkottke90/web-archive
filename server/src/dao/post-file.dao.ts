import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostFile } from '@prisma/client';
import { DBClient } from '../db';
import { PostFileCreateDTO, PostFileDTO } from '../dto/post-file.dto';
import { FileSystemFactory } from '../services';
import { POSTS } from '../routes';

@Injectable()
export class PostFileDao extends BaseDao<PostFile, any> {
  constructor(
    @Inject('PrismaClient') private readonly client: DBClient,
    @Inject('FileSystemFactory') private readonly fileSystem: FileSystemFactory
  ) {
    super(client);
  }

  create(postId: number, dto: PostFileCreateDTO) {
    return this.client.postFile.create({
      data: { postId, ...dto }
    });
  }

  async delete(postFileId: number) {
    const file = await this.client.postFile.findFirst();

    if (!file) {
      throw new Error(`PostFile with ID [${postFileId}] not found`);
    }

    await this.client.postFile.delete({ where: { id: postFileId } });

    await this.fileSystem.remove(file.filename);
  }

  async deleteFiles(postId: number) {
    const files = await this.client.postFile.findMany({ where: { postId } });

    for (const file of files) {
      await this.fileSystem.remove(file.filename);
    }
  }

  deleteRecord(postFileId: number) {
    return this.client.postFile.delete({ where: { id: postFileId } });
  }

  getById(id: number) {
    return this.client.postFile.findFirst(this.idSelector(id));
  }

  toDTO(entity: PostFile): PostFileDTO {
    return {
      id: entity.id,
      encoding: entity.encoding,
      filename: entity.filename,
      original_filename: entity.original_filename,
      mime: entity.mime,
      size: entity.size,

      links: {
        self: POSTS.FILES_WITH_ID.url({
          postId: entity.postId,
          fileId: entity.id
        }),
        post: POSTS.WITH_ID.url({ postId: entity.postId }),
        media: POSTS.FILES_CONTENT.url({
          postId: entity.postId,
          fileId: entity.id
        })
      },

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: any): Partial<PostFile> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostFileDao', useClass: PostFileDao }]);
