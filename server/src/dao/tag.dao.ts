import { Container, Inject, Injectable } from '@decorators/di';
import { Prisma } from '@prisma/client';
import { BaseDao } from './base.dao';
import { Tag } from '@prisma/client';
import { DBClient } from '../db';
import {
  TagCreateDTO,
  TagDTO,
  TagQueryDTO,
  TagUpdateDTO
} from '@web-archive/shared';
import { TAGS } from '../routes';

@Injectable()
export class TagDao extends BaseDao<Tag, TagDTO> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  addTag(input: TagCreateDTO) {
    return this.client.tag.create({
      data: {
        label: input.label,
        color: input.color,
        textColor: input.textColor
      }
    });
  }

  find(query: TagQueryDTO) {
    const { take, skip, orderBy, data } = this.parseQuery(query);
    const { label, ...restData } = data;

    const where: Prisma.TagWhereInput = {
      ...this.toPersistance(restData),
      NOT: data.NOT
    };

    if (label) {
      where.label = { contains: label, mode: 'insensitive' };
    }

    return this.client.tag.findMany({ take, skip, orderBy, where });
  }

  getByLabel(label: string) {
    return this.prisma.tag.findFirst({ where: { label } });
  }

  getById(id: number) {
    return this.prisma.tag.findFirst({ where: { id } });
  }

  removeTag(id: number) {
    return this.client.tag.delete({
      where: { id }
    });
  }

  updateTag(id: number, tag: TagCreateDTO | TagUpdateDTO) {
    return this.client.tag.update({
      where: { id },
      data: tag
    });
  }

  toDTO(entity: Tag): TagDTO {
    return {
      id: entity.id,

      label: entity.label,

      color: entity.color,
      textColor: entity.textColor,

      links: {
        self: TAGS.WITH_ID.url({ tagId: entity.id })
      },

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
  toPersistance(entity: Partial<TagDTO>): Partial<Tag> {
    return {
      id: entity.id,
      label: entity.label,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}

Container.provide([{ provide: 'TagDao', useClass: TagDao }]);
