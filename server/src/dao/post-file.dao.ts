import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { PostFile } from '@prisma/client';
import { DBClient } from '../db';
import {
  PostFileCreateDTO,
  PostFileDTO,
  PostFileUpdateDTO
} from '@web-archive/shared';
import { FileSystemFactory } from '../services';
import { POSTS } from '../routes';

@Injectable()
export class PostFileDao extends BaseDao<PostFile, PostFileDTO> {
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
    const file = await this.client.postFile.findFirst({
      where: { id: postFileId }
    });

    if (!file) {
      throw new Error(`PostFile with ID [${postFileId}] not found`);
    }

    await this.client.postFile.delete({ where: { id: postFileId } });

    await this.fileSystem.remove(file.filename);
  }

  update(postFileId: number, dto: PostFileUpdateDTO) {
    return this.client.postFile.update({
      where: { id: postFileId },
      data: dto
    });
  }

  setPlaceholder(
    postFileId: number,
    data: {
      width: number | null;
      height: number | null;
      placeholder: string;
    }
  ) {
    return this.client.postFile.update({
      where: { id: postFileId },
      data
    });
  }

  async getPlaceholderStatus() {
    const imageFilter = { mime: { startsWith: 'image' } };

    const [total, pending, failed] = await Promise.all([
      this.client.postFile.count({ where: imageFilter }),
      this.client.postFile.count({
        where: { ...imageFilter, placeholder: null }
      }),
      this.client.postFile.count({
        where: { ...imageFilter, placeholder: '' }
      })
    ]);

    return { total, pending, failed, complete: total - pending - failed };
  }

  findMissingPlaceholders(limit = 25) {
    return this.client.postFile.findMany({
      where: { mime: { startsWith: 'image' }, placeholder: null },
      take: limit,
      orderBy: { id: 'asc' }
    });
  }

  async replace(
    postFileId: number,
    dto: PostFileUpdateDTO,
    oldFilename: string
  ) {
    await this.client.$transaction(async (tx) => {
      await tx.postFile.update({
        where: { id: postFileId },
        data: dto
      });

      await this.fileSystem.remove(oldFilename);
    });
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
      width: entity.width,
      height: entity.height,
      placeholder: entity.placeholder,

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
  toPersistance(_entity: PostFileDTO): Partial<PostFile> {
    throw new Error('Method not implemented.');
  }
}

Container.provide([{ provide: 'PostFileDao', useClass: PostFileDao }]);
