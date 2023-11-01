import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { Post, Prisma } from '@prisma/client';
import { DBClient } from '../db';
import { PostCreateDTO, PostDTO, PostQueryDTO } from '../dto/post.dto';
import { ROUTES } from '../config';

@Injectable()
export class PostDao extends BaseDao<Post, PostDTO> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  find(query: PostQueryDTO) {
    const { take, skip, orderBy, data } = this.parseQuery(query);

    return this.client.post.findMany({
      take,
      skip,
      orderBy: orderBy,
      where: this.toPersistance(data)
    });
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

  toDTO(input: Post): PostDTO {
    return {
      self: `${ROUTES.POSTS}/${input.id}`,

      author: input.author,
      label: input.label,
      source: input.source,

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
}

Container.provide([{ provide: 'PostDao', useClass: PostDao }]);
