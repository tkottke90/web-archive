import { Container } from '@decorators/di';
import { randomUUID } from 'crypto';
import { NotFoundError } from '../utilities/errors.util';

type JobAction = () => any | Promise<any>;

enum JobStatus {
  QUEUED,
  STARTED,
  COMPLETED,
  ERROR
}

interface Job {
  id: string;
  postId: number;
  action: JobAction;
  status: JobStatus;
}

export class TaskFactory {
  private jobList: Job[] = [];
  private jobs: Map<string, Job> = new Map();
  private jobPostMap: Map<number, string> = new Map();

  createJob(postId: number, action: JobAction) {
    const job: Job = {
      id: randomUUID(),
      postId,
      action,
      status: JobStatus.QUEUED
    };

    this.jobs.set(job.id, job);
    this.jobPostMap.set(postId, job.id);

    return job.id;
  }

  /**
   * Get a list of items in the queue and their
   * current status
   */
  getJobStatus(postId: number) {
    const jobId = this.jobPostMap.get(postId);
    if (!jobId) {
      throw new NotFoundError('No Job Found Matching Post');
    }

    const job = this.jobs.get(jobId);

    if (!job) {
      throw new NotFoundError('No Job Found Matching Post');
    }

    return job.status;
  }
}

Container.provide([{ provide: 'TaskFactory', useClass: TaskFactory }]);
