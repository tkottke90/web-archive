import { Fragment } from 'preact';
import { JobDetail } from '../../services/job.service';
import { statusColor } from './status-color';

interface JobDrawerProps {
  job: JobDetail;
  onClose: () => void;
  onRetry: (retryUrl: string) => void;
}

export function JobDrawer({ job, onClose, onRetry }: JobDrawerProps) {
  return (
    <Fragment>
      <div
        class="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div class="fixed top-0 right-0 bottom-0 z-50 w-[90%] md:w-[90%] lg:w-[500px] bg-white shadow-lg overflow-y-auto">
        <div class="p-4 flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <h3 class="text-xl font-bold">Job #{job.job_id}</h3>
            <button
              class="px-2 py-1 text-sm border border-cloud-400 rounded hover:bg-cloud-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex gap-2">
              <span class="font-medium text-slate-600">Status:</span>
              <span class={statusColor(job.status)}>{job.status}</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-slate-600">Type:</span>
              <span>{job.type}</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-slate-600">Created:</span>
              <span>{new Date(job.createdAt).toLocaleString()}</span>
            </div>
            <div class="flex gap-2">
              <span class="font-medium text-slate-600">Updated:</span>
              <span>{new Date(job.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {job.jobNotes && (
            <div>
              <h4 class="font-medium text-slate-600 mb-1">Notes</h4>
              <pre class="bg-cloud-200 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {job.jobNotes}
              </pre>
            </div>
          )}

          <div>
            <h4 class="font-medium text-slate-600 mb-1">Job Data</h4>
            <pre class="bg-cloud-200 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap">
              <code>{JSON.stringify(job.data, null, 2)}</code>
            </pre>
          </div>

          {job.status === 'ERROR' && (
            <div class="flex gap-2">
              <button
                class="px-3 py-1 text-sm bg-burnt-500 text-slate-200 rounded hover:brightness-110"
                onClick={() => onRetry(job.links.retry)}
              >
                Retry Job
              </button>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
