import { useSignal } from '@preact/signals';
import { Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { Card } from '../../components/Layouts/Card';
import { CustomComponent } from '../../utilities/component.utils';
import { useDetailsPageContext } from './context';
import { getJobDetail, JobDetail, JobListItem, retryJob } from '../../services/job.service';
import { getPortalContainer } from '../../utilities/dom.utils';

const portal = getPortalContainer('modals');

function statusColor(status: string): string {
  switch (status) {
    case 'ERROR':
      return 'text-red-600 font-bold';
    case 'IN_PROGRESS':
      return 'text-blue-600 font-bold';
    default:
      return '';
  }
}

export function JobCard({ className }: CustomComponent) {
  const { post } = useDetailsPageContext();
  const collapsed = useSignal(true);
  const selectedJob = useSignal<JobDetail | null>(null);

  const jobList: JobListItem[] = (post.value as any)?.jobs ?? [];

  if (jobList.length === 0) {
    return null;
  }

  const openJobDetail = async (jobId: number) => {
    const detail = await getJobDetail(jobId);
    selectedJob.value = detail;
  };

  const handleRetry = async (retryUrl: string) => {
    const newJob = await retryJob(retryUrl);
    selectedJob.value = newJob;
  };

  return (
    <Fragment>
      <Card className={`col-span-4 h-fit ${className}`}>
        <button
          class="w-full text-left flex justify-between items-center"
          onClick={() => {
            collapsed.value = !collapsed.value;
          }}
        >
          <h4>Jobs ({jobList.length})</h4>
          <span class="text-sm text-slate-500">
            {collapsed.value ? '▶' : '▼'}
          </span>
        </button>

        {!collapsed.value && (
          <table class="w-full text-left mt-2">
            <thead>
              <tr class="border-b border-cloud-400">
                <th>ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {jobList.map((job) => (
                <tr
                  key={job.job_id}
                  class="border-b border-cloud-200 hover:bg-cloud-200 cursor-pointer"
                  onClick={() => openJobDetail(job.job_id)}
                >
                  <td>{job.job_id}</td>
                  <td>{job.type}</td>
                  <td>
                    <span class={statusColor(job.status)}>{job.status}</span>
                  </td>
                  <td>{new Date(job.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {selectedJob.value &&
        createPortal(
          <JobDrawer
            job={selectedJob.value}
            onClose={() => {
              selectedJob.value = null;
            }}
            onRetry={handleRetry}
          />,
          portal
        )}
    </Fragment>
  );
}

interface JobDrawerProps {
  job: JobDetail;
  onClose: () => void;
  onRetry: (retryUrl: string) => void;
}

function JobDrawer({ job, onClose, onRetry }: JobDrawerProps) {
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
