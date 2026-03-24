import { Signal, batch, useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { Menu, Plus, Search, X } from "lucide-preact";
import { ComponentChildren } from "preact";
import { route } from "preact-router";
import BottomAppBar from "../../components/Layouts/BottomAppBar";
import { DrawerLayout } from "../../components/Layouts/DrawerLayout";
import { Table } from "../../components/Table/Table";
import { currentPage, filterAuthor, filterKeyword, filterTags, getFilterParams, loadPosts, pageCount, posts, skip } from "../../services/post.service";
import { getTags } from "../../services/tags.service";
import { TagDTO } from "../../../../server/src/dto/post-tag.dto";

function currentPageQuery(pageId: number) {
  const url = new URL(location.href);
  url.searchParams.delete("currentPage");
  url.searchParams.append("currentPage", String(pageId));

  // Sync filter params into URL
  url.searchParams.delete("author");
  url.searchParams.delete("keyword");
  url.searchParams.delete("tag");

  const filters = getFilterParams();
  filters.forEach((value, key) => url.searchParams.append(key, value));

  return url
}

export function HomePage() {
  const drawerState = useSignal(false);

  useSignalEffect(() => {
    const query = currentPageQuery(currentPage.value);

    if (query.searchParams.get("refresh")) {
      loadPosts({ skip: skip.value });
      query.searchParams.delete("refresh");
    }

    history.pushState({ path: query.toString() }, "", query.toString());
  });

  return (
    <DrawerLayout openDrawer={drawerState}>
      <div class="bg-cloud-100 border rounded border-cloud-400 shadow-md p-4">
        <h2 className="text-2xl">
          <span>Posts</span>
        </h2>
        <br />
        <FilterBar />
        <br />
        <Table
          className=""
          onRowClick={(data) => {
            const query = currentPageQuery(currentPage.value);
            console.log(`${data.value.links.ui}`)
            route(`${data.value.links.ui}${query.search.toString()}`);
          }}
          entries={posts.value}
          headers={[
            { key: "label", label: "Label", className: "font-bold capitalize" },
            { key: "author", label: "Author" },
            {
              key: "tags",
              label: "Tags",
              transform: (tags) => (tags ?? []).slice(0, 3).map((tag) => <Tag>{tag.value}</Tag>),
              className: "flex flex-wrap gap-px",
              columnStyles: "md:w-60",
            },
            { key: "createdAt", label: "Added On", transform: (date) => new Date(date).toLocaleDateString(), className: "text-right", columnStyles: "md:w-32" },
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

      <BottomAppBar>
        <BottomAppBar.AppBarHeader>
          <BottomAppBar.AppBarOpenBtnSlot><Menu /></BottomAppBar.AppBarOpenBtnSlot>
          <BottomAppBar.AppBarCalloutBtnSlot><Plus /></BottomAppBar.AppBarCalloutBtnSlot>
          <BottomAppBar.AppBarSlot />
        </BottomAppBar.AppBarHeader>

        <BottomAppBar.AppBarBody>

        </BottomAppBar.AppBarBody>
      
      </BottomAppBar>
    </DrawerLayout>
  );
}

function FilterBar() {
  const allTags = useSignal<TagDTO[]>([]);
  const tagSearchInput = useSignal('');
  const localKeyword = useSignal(filterKeyword.value);
  const localAuthor = useSignal(filterAuthor.value);

  // Load all tags on mount
  useSignalEffect(() => {
    getTags().then(tags => { allTags.value = tags; });
  });

  // Find tag labels for selected tag IDs
  const selectedTagLabels = useComputed(() => {
    return filterTags.value.map(id => {
      const tag = allTags.value.find(t => t.id === id);
      return { id, label: tag?.label ?? `Tag ${id}` };
    });
  });

  // Filter available tags based on search input and exclude already selected
  const availableTags = useComputed(() => {
    const selected = new Set(filterTags.value);
    return allTags.value
      .filter(t => !selected.has(t.id))
      .filter(t => !tagSearchInput.value || t.label.toLowerCase().includes(tagSearchInput.value.toLowerCase()));
  });

  const showTagDropdown = useSignal(false);

  const applyFilters = () => {
    batch(() => {
      filterKeyword.value = localKeyword.value;
      filterAuthor.value = localAuthor.value;
      currentPage.value = 1;
    });
  };

  return (
    <div class="flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-[150px]">
        <label class="block text-sm font-medium text-slate-600 mb-1">Keyword</label>
        <div class="relative">
          <Search class="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            class="w-full pl-8 pr-2 py-1 border border-cloud-400 rounded bg-white text-sm"
            placeholder="Search label or author..."
            value={localKeyword.value}
            onInput={(e) => {
              localKeyword.value = (e.target as HTMLInputElement).value;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
          />
        </div>
      </div>
      <div class="flex-1 min-w-[150px]">
        <label class="block text-sm font-medium text-slate-600 mb-1">Author</label>
        <input
          type="text"
          class="w-full px-2 py-1 border border-cloud-400 rounded bg-white text-sm"
          placeholder="Filter by author..."
          value={localAuthor.value}
          onInput={(e) => {
            localAuthor.value = (e.target as HTMLInputElement).value;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyFilters();
          }}
        />
      </div>
      <div class="flex-1 min-w-[200px] relative">
        <label class="block text-sm font-medium text-slate-600 mb-1">Tags</label>
        <input
          type="text"
          class="w-full px-2 py-1 border border-cloud-400 rounded bg-white text-sm"
          placeholder="Search tags..."
          value={tagSearchInput.value}
          onInput={(e) => {
            tagSearchInput.value = (e.target as HTMLInputElement).value;
          }}
          onFocus={() => { showTagDropdown.value = true; }}
        />
        {showTagDropdown.value && availableTags.value.length > 0 && (
          <div class="absolute z-50 w-full mt-1 bg-white border border-cloud-400 rounded shadow-md max-h-40 overflow-y-auto">
            <div class="fixed inset-0 z-40" role="presentation" onClick={() => { showTagDropdown.value = false; }} />
            {availableTags.value.slice(0, 10).map(tag => (
              <div
                class="relative z-50 px-3 py-1 text-sm cursor-pointer hover:bg-burnt-500 hover:text-slate-200"
                onClick={() => {
                  filterTags.value = [...filterTags.value, tag.id];
                  tagSearchInput.value = '';
                  showTagDropdown.value = false;
                  currentPage.value = 1;
                }}
              >
                {tag.label}
              </div>
            ))}
          </div>
        )}
        {selectedTagLabels.value.length > 0 && (
          <div class="flex flex-wrap gap-1 mt-1">
            {selectedTagLabels.value.map(tag => (
              <span class="inline-flex items-center gap-1 rounded-full bg-crown-300 px-2 py-0.5 text-xs font-bold">
                {tag.label}
                <X
                  class="w-3 h-3 cursor-pointer hover:brightness-150"
                  onClick={() => {
                    filterTags.value = filterTags.value.filter(id => id !== tag.id);
                    currentPage.value = 1;
                  }}
                />
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        class="px-3 py-1 text-sm bg-burnt-500 text-slate-200 rounded hover:brightness-110"
        onClick={applyFilters}
      >
        Search
      </button>
      {(filterAuthor.value || filterKeyword.value || localKeyword.value || localAuthor.value || filterTags.value.length > 0) && (
        <button
          class="px-3 py-1 text-sm border border-cloud-400 rounded hover:bg-cloud-200"
          onClick={() => {
            batch(() => {
              localKeyword.value = '';
              localAuthor.value = '';
              filterAuthor.value = '';
              filterKeyword.value = '';
              filterTags.value = [];
              currentPage.value = 1;
            });
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function Tag({ children }: { children: ComponentChildren }) {
  return <span className="rounded-full bg-crown-300 px-2 py-1 whitespace-nowrap font-bold text-sm">{children}</span>;
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
