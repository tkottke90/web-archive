import {
  Signal,
  useComputed,
  useSignal,
  useSignalEffect
} from '@preact/signals';
import { Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { DrawerLayout } from '../../components/Layouts/DrawerLayout';
import {
  currentPage,
  filterStatus,
  getJobDetail,
  JobDetail,
  jobs,
  jobStatuses,
  loadJobs,
  pageCount,
  retryJob
} from '../../services/job.service';
import { Table } from '../../components/Table/Table';
import { getPortalContainer } from '../../utilities/dom.utils';

const portal = getPortalContainer('modals');

const PAGE_SIZE = 10;

export function JobsPage() {
  const drawerState = useSignal(false);
  const selectedJob = useSignal<JobDetail | null>(null);

  useSignalEffect(() => {
    const skip = (currentPage.value - 1) * PAGE_SIZE;
    loadJobs({
      skip,
      status: filterStatus.value || undefined
    });
  });

  const openJobDetail = async (jobId: number) => {
    const detail = await getJobDetail(jobId);
    selectedJob.value = detail;
  };

  const handleRetry = async (retryUrl: string) => {
    const newJob = await retryJob(retryUrl);
    selectedJob.value = newJob;
    const skip = (currentPage.value - 1) * PAGE_SIZE;
    loadJobs({ skip, status: filterStatus.value || undefined });
  };

  return (
    <DrawerLayout openDrawer={drawerState}>
      <div class="bg-cloud-100 border rounded border-cloud-400 shadow-md p-4">
        <h2 className="text-2xl">Jobs</h2>
        <br />
        <StatusFilter />
        <br />
        <Table
          className=""
          onRowClick={(data) => {
            openJobDetail(data.value.job_id);
          }}
          entries={jobs.value}
          headers={[
            { key: 'job_id', label: 'Job ID', columnStyles: 'w-20' },
            { key: 'type', label: 'Type' },
            {
              key: 'status',
              label: 'Status',
              transform: (status) => (
                <span class={statusColor(status)}>{status}</span>
              )
            },
            {
              key: 'createdAt',
              label: 'Created',
              transform: (date) => new Date(date).toLocaleString(),
              columnStyles: 'md:w-48'
            }
          ]}
        />
        <br />
        <Pagination
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={(nextPage) => {
            currentPage.value = nextPage;
          }}
        />
      </div>

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
    </DrawerLayout>
  );
}

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

function StatusFilter() {
  return (
    <div class="flex gap-3 items-end">
      <div class="min-w-[200px]">
        <label class="block text-sm font-medium text-slate-600 mb-1">
          Status
        </label>
        <select
          class="w-full px-2 py-1 border border-cloud-400 rounded bg-white text-sm"
          value={filterStatus.value}
          onChange={(e) => {
            filterStatus.value = (e.target as HTMLSelectElement).value;
            currentPage.value = 1;
          }}
        >
          <option value="">All</option>
          {jobStatuses.value.map((status) => (
            <option value={status}>{status}</option>
          ))}
        </select>
      </div>
    </div>
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

interface PaginationProps {
  pageCount: Signal<number>;
  currentPage: Signal<number>;
  onPageChange: (nextPage: number) => void;
}

function Pagination(props: PaginationProps) {
  const localPage = useSignal(props.currentPage.value);

  useSignalEffect(() => {
    localPage.value = props.currentPage.value;
  });

  const minDisabled = useComputed(() => {
    return props.currentPage.value <= 1;
  });

  const maxDisabled = useComputed(() => {
    return props.currentPage.value >= props.pageCount.value;
  });

  const commitPage = () => {
    const page = Math.max(1, Math.min(localPage.value, props.pageCount.value));
    localPage.value = page;
    props.onPageChange(page);
  };

  return (
    <div class="flex gap-2 ml-auto justify-end">
      <button
        disabled={minDisabled}
        onClick={() => {
          if (!minDisabled.value) {
            props.onPageChange(props.currentPage.value - 1);
          }
        }}
      >
        Prev
      </button>
      <span>
        <span>Page&nbsp;</span>
        <input
          type="number"
          className="inline bg-transparent border-b-2 border-slate-300 w-16 text-right"
          min={1}
          max={props.pageCount.value}
          value={localPage.value}
          onInput={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            if (!isNaN(val)) localPage.value = val;
          }}
          onBlur={() => commitPage()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitPage();
            }
          }}
        />
        <span>&nbsp;of {props.pageCount}</span>
      </span>

      <button
        disabled={maxDisabled}
        onClick={() => {
          if (!maxDisabled.value) {
            props.onPageChange(props.currentPage.value + 1);
          }
        }}
      >
        Next
      </button>
    </div>
  );
}
