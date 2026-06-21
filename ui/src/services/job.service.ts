import { Signal, batch } from '@preact/signals';
import { get, post } from '../utilities/http.utils';
import { Http } from '../interfaces/http.interface';

export interface JobListItem {
  job_id: number;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobDetail {
  job_id: number;
  type: string;
  status: string;
  done: boolean;
  // NOTE: Typed as `unknown` because the server stores this as Prisma `Json`,
  // which can be any JSON value (object, array, string, number, or null).
  // Currently all job data schemas are managed on the backend so this is
  // effectively always a Record<string, unknown>, but the type here stays
  // loose to match the actual database contract.
  data: unknown;
  jobNotes: string;
  createdAt: string;
  updatedAt: string;
  links: {
    self: string;
    retry?: string;
  };
}

interface JobListResponse {
  jobs: JobListItem[];
  statuses: string[];
  pagination: Http.Pagination;
}

export const JOB_STATUS = {
  QUEUED: 'QUEUED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR'
} as const;

export const jobs = new Signal<Signal<JobListItem>[]>([]);
export const jobStatuses = new Signal<string[]>([]);
export const currentPage = new Signal(1);
export const pageCount = new Signal(0);
export const filterStatus = new Signal('');

export const PAGE_SIZE = 10;

export async function loadJobs(options?: {
  limit?: number;
  skip?: number;
  status?: string;
}) {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', `${options?.limit ?? PAGE_SIZE}`);
  queryParams.append('skip', `${options?.skip ?? 0}`);

  if (options?.status) {
    queryParams.append('status', options.status);
  }

  const data = await get<JobListResponse>(
    `/api/jobs?${queryParams.toString()}`
  );

  batch(() => {
    jobs.value = data.jobs.map((job) => new Signal(job));
    jobStatuses.value = data.statuses;
    currentPage.value = data.pagination.currentPage;
    pageCount.value = data.pagination.totalPages;
  });
}

export async function getJobDetail(jobId: number): Promise<JobDetail> {
  return get<JobDetail>(`/api/jobs/${jobId}`);
}

export async function retryJob(retryUrl: string): Promise<JobDetail> {
  return post<undefined, JobDetail>(retryUrl);
}
