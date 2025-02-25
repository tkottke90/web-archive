import { Signal, useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { Menu } from "lucide-preact";
import { ComponentChildren } from "preact";
import { route } from "preact-router";
import { AppBarCalloutBtn, AppBarOpenBtn, BottomAppBar } from "../../components/Layouts/BottomAppBar";
import { DrawerLayout } from "../../components/Layouts/DrawerLayout";
import { Table } from "../../components/Table/Table";
import { currentPage, loadPosts, pageCount, posts, skip } from "../../services/post.service";

function currentPageQuery(pageId: number) {
  const url = new URL(location.href);
  url.searchParams.delete("currentPage");
  url.searchParams.append("currentPage", String(pageId));

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

      <BottomAppBar
        slots={{
          left: <AppBarOpenBtn alignment="start"><Menu /></AppBarOpenBtn>,
          center: <AppBarCalloutBtn />
        }}
      >
        <section>
          <p>Things go here for the ome page</p>
        </section>
      </BottomAppBar>
    </DrawerLayout>
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
  const minDisabled = useComputed(() => {
    return props.currentPage.value <= 1;
  });

  const maxDisabled = useComputed(() => {
    return props.currentPage.value >= props.pageCount.value;
  });

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
          value={props.currentPage.value}
          onChange={(e) => {
            e.preventDefault();

            const target = e.target as HTMLInputElement;
            props.onPageChange(Number(target.value));
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
