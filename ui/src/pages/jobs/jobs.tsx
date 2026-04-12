import {
  Signal,
  useComputed,
  useSignal,
  useSignalEffect
} from '@preact/signals';
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
import { statusColor } from '../../components/Jobs/status-color';
import { JobDrawer } from '../../components/Jobs/JobDrawer';

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
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
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
