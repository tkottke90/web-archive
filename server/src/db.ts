import { Container } from '@decorators/di';
import { PrismaClient } from '@prisma/client';

const prismaInstance = new PrismaClient();

export type DBClient = typeof prismaInstance;

Container.provide([{ provide: 'PrismaClient', useValue: prismaInstance }]);

// export const prismaClient = prismaInstance;
