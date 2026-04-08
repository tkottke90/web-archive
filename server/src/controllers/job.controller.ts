import {
  Controller,
  Get,
  Next,
  Params,
  Post,
  Query,
  Response
} from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import { DownloadJobDao, JobQueryDTO } from '../dao/download-job.dao';
import {
  ZodIdValidator,
  ZodQueryValidator
} from '../middleware/zod.middleware';
import { JOBS } from '../routes';
import { JOB_STATUS } from '../constants';
import { z } from 'zod';
import { FuzzyNumber } from '../dto/utilities';
import { NotFoundError, BadRequestError } from '../utilities/errors.util';

const JobQuerySchema = z.object({
  limit: FuzzyNumber.optional(),
  skip: FuzzyNumber.optional(),
  status: z.string().optional()
});

@Controller(JOBS.ROOT.path)
export class JobController {
  constructor(
    @Inject('DownloadJobDao')
    private readonly downloadJobsDao: DownloadJobDao
  ) {}

  @Get('/', [ZodQueryValidator(JobQuerySchema)])
  async getJobs(
    @Query() query: JobQueryDTO,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const jobs = await this.downloadJobsDao.find(query);

      res.json({
        jobs: jobs.map((job) => this.downloadJobsDao.toJobListItem(job)),
        statuses: Object.values(JOB_STATUS),
        pagination: await this.downloadJobsDao.paginationDetails(query)
      });
    } catch (error) {
      next(error);
    }
  }

  @Get(JOBS.WITH_ID.path, [ZodIdValidator('jobId')])
  async getJob(
    @Params('jobId') jobId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const job = await this.downloadJobsDao.getById(jobId);

      if (!job) {
        throw new NotFoundError(`Job with id ${jobId} not found`);
      }

      res.json(this.downloadJobsDao.toJobDetail(job));
    } catch (error) {
      next(error);
    }
  }

  @Post(JOBS.RETRY.path, [ZodIdValidator('jobId')])
  async retryJob(
    @Params('jobId') jobId: number,
    @Response() res: express.Response,
    @Next() next: express.NextFunction
  ) {
    try {
      const job = await this.downloadJobsDao.getById(jobId);

      if (!job) {
        throw new NotFoundError(`Job with id ${jobId} not found`);
      }

      if (job.status !== JOB_STATUS.ERROR) {
        throw new BadRequestError('Only jobs with error status can be retried');
      }

      const newJob = await this.downloadJobsDao.retryJob(job);

      res.status(201).json(this.downloadJobsDao.toJobDetail(newJob));
    } catch (error) {
      next(error);
    }
  }
}
