import type { DBClient } from '../db';
import { basename } from 'path';

type Optional<T> = T | undefined;
type QueryDTO = Record<string, any> & {
  limit?: number;
  skip?: number;
  sort?: { [key: string]: 'ASC' | 'DESC' };
};

export abstract class BaseDao<Model, DTO> {
  constructor(protected prismaClient: DBClient) {}

  get prisma() {
    return this.prismaClient;
  }

  idSelector(id: number) {
    return { where: { id } };
  }

  getResourceIdFromPath(path: string) {
    return Number(basename(path));
  }

  parseQuery<DTO extends QueryDTO>(dto: DTO) {
    const query = structuredClone(dto);

    delete query.limit;
    delete query.skip;
    delete query.sort;

    return {
      take: dto.limit ?? 10,
      skip: dto.skip ?? 0,
      orderBy: dto.sort ?? undefined,
      data: query
    };
  }

  abstract toDTO(entity: Model): DTO;
  abstract toPersistance(entity: DTO): Partial<Model>;
}
