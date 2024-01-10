import { Container, Inject, Injectable } from '@decorators/di';
import cron from 'node-cron';
import { LoggerService } from '../services/logger.service';
import {
  JobNotFoundError,
  JobTimingStringInvalid
} from '../errors/job-scheduler.errors';

@Injectable()
export class JobScheduler {
  constructor(@Inject('LoggerService') private readonly logger: LoggerService) {
    this.createRedditScheduler();
  }

  register(
    name: string,
    task: () => void,
    options?: { timing?: string; start?: boolean }
  ) {
    const parsedTiming = options?.timing ?? '* * * * *';

    if (!this.validateSchedule(parsedTiming)) {
      throw new JobTimingStringInvalid(
        `Invalid timing string provided for job: [${parsedTiming}]`
      );
    }

    cron.schedule(parsedTiming, task, {
      name,
      scheduled: options?.start ?? false
    });
  }

  startJob(jobName: string) {
    const task = cron.getTasks().get(jobName);

    if (!task) {
      throw new JobNotFoundError(`Job with name [${jobName}] not found`);
    }

    task.start();
  }

  stopJob(jobName: string) {
    const task = cron.getTasks().get(jobName);

    if (!task) {
      throw new JobNotFoundError(`Job with name [${jobName}] not found`);
    }

    task.stop();
  }

  private createRedditScheduler() {
    return cron.schedule(
      this.validateSchedule('*/1 * * * *'),
      (now) => {
        this.logger.log('debug', 'Reddit Scheduler Run', { timestamp: now });
      },
      {
        name: 'Reddit',
        scheduled: false
      }
    );
  }

  private validateSchedule(input: string) {
    if (!cron.validate(input))
      throw new Error(`Invalid Schedule String [${input}]`);

    return input;
  }
}

Container.provide([{ provide: 'JobScheduler', useClass: JobScheduler }]);
