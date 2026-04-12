import { useSignal } from '@preact/signals';
import { Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { Card } from '../../components/Layouts/Card';
import { CustomComponent } from '../../utilities/component.utils';
import { useDetailsPageContext } from './context';
import { getJobDetail, JobDetail, JobListItem, retryJob } from '../../services/job.service';
import { getPortalContainer } from '../../utilities/dom.utils';
import { statusColor } from '../../components/Jobs/status-color';
import { JobDrawer } from '../../components/Jobs/JobDrawer';

const portal = getPortalContainer('modals');

type PostWithJobs = {
  jobs?: JobListItem[];
};

function getJobList(post: unknown): JobListItem[] {
  if (!post || typeof post !== 'object' || !('jobs' in post)) {
    return [];
  }

  const { jobs } = post as PostWithJobs;
  return Array.isArray(jobs) ? jobs : [];
}

export function JobCard({ className }: CustomComponent) {
  const { post } = useDetailsPageContext();
  const collapsed = useSignal(true);
  const selectedJob = useSignal<JobDetail | null>(null);

  const jobList = getJobList(post.value);

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
