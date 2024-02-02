import { Container, Inject, Injectable } from '@decorators/di';
import { BaseDao } from './base.dao';
import { DBClient } from '../db';
import { NotImplementedError } from '../errors/generic-errors';
import { JOB_STATUS } from '../constants';

interface DownloadJobCreate {
  data: Record<string, any>;
  parser: string;
}

@Injectable()
export class DownloadJobDao extends BaseDao<unknown, unknown> {
  constructor(@Inject('PrismaClient') private client: DBClient) {
    super(client);
  }

  toDTO(entity: any): any {
    throw new NotImplementedError();
  }

  toPersistance(entity: any): Partial<any> {
    throw new NotImplementedError();
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
