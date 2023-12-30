import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { Post, Prisma } from '@prisma/client';
import { DBClient } from '../db';
import { PostCreateDTO, PostDTO, PostQueryDTO } from '../dto/post.dto';
import { ROUTES } from '../config';
import { PostFileDao } from './post-file.dao';
import { PostTagDao } from './post-tag.dao';
import { PostMetadataDao } from './post-metadata.dao';
import { PostWithAssociations } from '../interfaces';

const POST_DETAILS = {
  postTags: { include: { tags: true } },
  files: true,
  metadata: true
};

@Injectable()
export class PostDao extends BaseDao<Post, PostDTO> {
  constructor(
    @Inject('PrismaClient') private readonly client: DBClient,
    @Inject('PostFileDao') private readonly postFileDao: PostFileDao,
    @Inject('PostTagDao') private readonly postTagDao: PostTagDao,
    @Inject('PostMetadataDao') private readonly postMetadataDao: PostMetadataDao
  ) {
    super(client);
  }

  getById(id: number) {
    return this.client.post.findFirst({
      where: { id },
      include: POST_DETAILS
    }) as unknown as PostWithAssociations;
  }

  getByMetadataValue(key: string, value: string) {
    return this.client.post.findFirst({
      where: {
        metadata: {
          some: {
            name: key,
            value
          }
        }
      },
      include: POST_DETAILS
    });
  }

  find(query: PostQueryDTO) {
    const { take, skip, orderBy, where } = this.generateFindStatement(query);

    return this.client.post.findMany({
      take,
      skip,
      orderBy: orderBy,
      where,
      include: POST_DETAILS
    }) as unknown as PostWithAssociations[];
  }

  create(input: PostCreateDTO) {
    const metadata:
      | Prisma.PostMetadataCreateNestedManyWithoutPostInput
      | undefined = input.metadata
      ? {
          createMany: {
            data: input.metadata.map((item) => ({
              name: item.name,
              value: item.value
            }))
          }
        }
      : undefined;

    const files: Prisma.PostFileCreateNestedManyWithoutPostInput | undefined =
      input.files
        ? {
            createMany: {
              data: input.files.map((file) => ({
                encoding: file.encoding,
                filename: file.filename,
                original_filename: file.original_filename,
                mime: file.mime,
                size: file.size
              }))
            }
          }
        : undefined;

    return this.client.post.create({
      data: {
        author: input.author,
        label: input.label,
        source: input.source,
        metadata,
        files
      }
    });
  }

  async remove(postId: number) {
    await this.postFileDao.deleteFiles(postId);

    return this.client.post.delete({
      where: { id: postId }
    });
  }

  async paginationDetails(query: PostQueryDTO) {
    const { take, skip, where } = this.generateFindStatement(query);

    const count = await this.client.post.count({ where });

    return {
      currentPage: Math.ceil(skip / take) + 1,
      totalPages: Math.ceil(count / take),
      totalItems: count
    };
  }

  toDTO(input: PostWithAssociations): PostDTO {
    return {
      self: `${ROUTES.POSTS}/${input.id}`,

      author: input.author,
      label: input.label,
      source: input.source,

      metadata: input.metadata.map(this.postMetadataDao.toDTO),
      files: input.files.map(this.postFileDao.toDTO),
      tags: input.postTags.map(this.postTagDao.toDTO),

      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };
  }

  toPersistance(input: Partial<PostDTO>): Partial<Post> {
    return {
      id: input.self ? this.getResourceIdFromPath(input.self) : undefined,
      author: input.author ?? undefined,
      label: input.label ?? undefined,
      createdAt: input.createdAt ?? undefined,
      updatedAt: input.updatedAt ?? undefined,
      source: input.source ?? undefined
    };
  }

  private generateFindStatement(query: PostQueryDTO) {
    const { take, skip, orderBy, data } = this.parseQuery(query);

    const where: Prisma.PostWhereInput = this.toPersistance(data);

    if (data.tag) {
      where.postTags = { some: { tagId: data.tag } };
    }

    return { take, skip, orderBy, where };
  }
}

Container.provide([{ provide: 'PostDao', useClass: PostDao }]);
