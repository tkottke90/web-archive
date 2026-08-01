import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { DBClient } from '../db';
import { NotImplementedError } from '../errors/generic-errors';
import { JOB_STATUS } from '../constants';
import { DownloadJob, Prisma } from '@prisma/client';
import { JOBS, UI_POSTS } from '../routes';

interface DownloadJobCreate {
  data: Prisma.InputJsonValue;
  parser: string;
}

export interface JobQueryDTO {
  limit?: number;
  skip?: number;
  status?: string;
}

@Injectable()
export class DownloadJobDao extends BaseDao<unknown, unknown> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  toDTO(_entity: unknown): unknown {
    throw new NotImplementedError();
  }

  private extractPostId(data: Prisma.JsonValue): number | undefined {
    if (
      typeof data === 'object' &&
      data !== null &&
      !Array.isArray(data) &&
      typeof data.postId === 'number'
    ) {
      return data.postId;
    }

    return undefined;
  }

  toJobListItem(entity: DownloadJob) {
    const postId = this.extractPostId(entity.data);

    return {
      job_id: entity.id,
      type: entity.parser,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      ...(postId !== undefined && {
        post_id: postId,
        links: {
          post: UI_POSTS.url({ postId })
        }
      })
    };
  }

  toJobDetail(entity: DownloadJob) {
    const postId = this.extractPostId(entity.data);

    return {
      job_id: entity.id,
      type: entity.parser,
      status: entity.status,
      done: entity.done,
      data: entity.data,
      jobNotes: entity.jobNotes,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      ...(postId !== undefined && { post_id: postId }),
      links: {
        self: JOBS.WITH_ID.url({ jobId: entity.id }),
        ...(postId !== undefined && {
          post: UI_POSTS.url({ postId })
        }),
        ...(entity.status === JOB_STATUS.ERROR && {
          retry: JOBS.RETRY.url({ jobId: entity.id })
        })
      }
    };
  }

  toPersistance(_entity: unknown): Partial<unknown> {
    throw new NotImplementedError();
  }

  getById(id: number) {
    return this.client.downloadJob.findUnique({
      where: { id: Number(id) }
    });
  }

  find(query: JobQueryDTO) {
    const take = query.limit ?? 10;
    const skip = query.skip ?? 0;
    const where = this.buildWhereClause(query);

    return this.client.downloadJob.findMany({
      take,
      skip,
      where,
      orderBy: { id: 'desc' }
    });
  }

  findByPostId(postId: number) {
    return this.client.downloadJob.findMany({
      where: {
        data: {
          path: ['postId'],
          equals: postId
        }
      },
      orderBy: { id: 'desc' }
    });
  }

  async paginationDetails(query: JobQueryDTO) {
    const take = query.limit ?? 10;
    const skip = query.skip ?? 0;
    const where = this.buildWhereClause(query);

    const count = await this.client.downloadJob.count({ where });
    const currentPage = Math.floor(skip / take) + 1;

    return {
      currentPage,
      totalPages: Math.ceil(count / take),
      totalItems: count
    };
  }

  private buildWhereClause(query: JobQueryDTO): Prisma.DownloadJobWhereInput {
    const where: Prisma.DownloadJobWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    return where;
  }

  retryJob(original: DownloadJob) {
    const data: Prisma.InputJsonValue =
      typeof original.data === 'object' && original.data !== null
        ? {
            ...(original.data as Prisma.JsonObject),
            retriedFrom: original.id
          }
        : { retriedFrom: original.id };

    return this.client.downloadJob.create({
      data: {
        parser: original.parser,
        data,
        status: JOB_STATUS.QUEUED,
        jobNotes: '',
        done: false
      }
    });
  }

  create(job: DownloadJobCreate[]) {
    return this.client.downloadJob.createMany({
      data: job.map((job) => ({
        status: JOB_STATUS.QUEUED,
        jobNotes: '',
        data: job.data,
        parser: job.parser
      }))
    });
  }

  countJobs(status: keyof typeof JOB_STATUS) {
    return this.client.downloadJob.count({
      where: { status }
    });
  }

  updateJobData(jobId: number, data: Prisma.InputJsonValue) {
    return this.client.downloadJob.update({
      data: { data },
      where: { id: jobId }
    });
  }

  completeJobs(jobId: number[]) {
    return this.client.downloadJob.updateMany({
      data: { status: JOB_STATUS.COMPLETE, done: true },
      where: { id: { in: jobId } }
    });
  }

  getNextJobs(parser: string, size = 10) {
    return this.client.downloadJob.findMany({
      take: size,
      where: { done: false, parser, status: JOB_STATUS.QUEUED }
    });
  }

  jobError(jobId: number, details: string) {
    return this.client.downloadJob.updateMany({
      data: { status: JOB_STATUS.ERROR, jobNotes: details, done: true },
      where: { id: jobId }
    });
  }

  startJobs(jobId: number[]) {
    return this.client.downloadJob.updateMany({
      data: { status: JOB_STATUS.IN_PROGRESS },
      where: { id: { in: jobId } }
    });
  }
}

Container.provide([{ provide: 'DownloadJobDao', useClass: DownloadJobDao }]);
