import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { Tag } from '@prisma/client';
import { DBClient } from '../db';
import { TagCreateDTO, TagDTO, TagQueryDTO } from '../dto/post-tag.dto';
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

    return this.client.tag.findMany({
      take,
      skip,
      orderBy: orderBy,
      where: { ...this.toPersistance(data), NOT: data.NOT }
    });
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

  updateTag(id: number, tag: TagCreateDTO) {
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
        self: TAGS.ROOT.url(undefined, { query: { id: entity.id } })
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
