import { JOB_STATUS } from '../../services/job.service';

export function statusColor(status: string): string {
  switch (status) {
    case JOB_STATUS.ERROR:
      return 'text-red-600 font-bold';
    case JOB_STATUS.IN_PROGRESS:
      return 'text-blue-600 font-bold';
    default:
      return '';
  }
}
