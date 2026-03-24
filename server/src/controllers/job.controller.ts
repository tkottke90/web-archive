import { Controller, Get, Next, Query, Response } from '@decorators/express';
import express from 'express';
import { Inject } from '@decorators/di';
import { DownloadJobDao, JobQueryDTO } from '../dao/download-job.dao';
import { ZodQueryValidator } from '../middleware/zod.middleware';
import { JOBS } from '../routes';
import { JOB_STATUS } from '../constants';
import { z } from 'zod';
import { FuzzyNumber } from '../dto/utilities';

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
}
