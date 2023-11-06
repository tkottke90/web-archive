import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { Tag } from '@prisma/client';
import { DBClient } from '../db';
import { TagCreateDTO, TagDTO, TagQueryDTO } from '../dto/post-tag.dto';
import { ROUTES } from '../config';

@Injectable()
export class TagDao extends BaseDao<Tag, TagDTO> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  find(query: TagQueryDTO) {
    const { take, skip, orderBy, data } = this.parseQuery(query);

    return this.client.tag.findMany({
      take,
      skip,
      orderBy: orderBy,
      where: this.toPersistance(data)
    });
  }

  addTag(input: TagCreateDTO) {
    return this.client.tag.create({
      data: {
        label: input.label
      }
    });
  }

  removeTag(id: number) {
    return this.client.tag.delete({
      where: { id }
    });
  }

  toDTO(entity: Tag): TagDTO {
    return {
      self: `${ROUTES.TAGS}/${entity.id}`,
      label: entity.label,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: Partial<TagDTO>): Partial<Tag> {
    return {
      id: entity.self ? this.getResourceIdFromPath(entity.self) : undefined,
      label: entity.label,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}

Container.provide([{ provide: 'TagDao', useClass: TagDao }]);
