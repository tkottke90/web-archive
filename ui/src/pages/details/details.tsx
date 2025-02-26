import { Signal, useSignal } from "@preact/signals";
import { Modal } from "@tkottke90/preact-components";
import { ArrowLeft, ArrowRight, ArrowUpLeft, ShieldAlert, Trash } from "lucide-preact";
import { ComponentChildren, Fragment, JSX } from "preact";
import { route } from "preact-router";
import { ConfirmButton } from "../../components/Buttons/ConfirmButton";
import BottomAppBar from "../../components/Layouts/BottomAppBar";
import { DrawerLayout } from "../../components/Layouts/DrawerLayout";
import { Http } from "../../interfaces/http.interface";
import { currentPage, deletePost } from "../../services/post.service";
import { CustomComponent } from "../../utilities/component.utils";
import { getPortalContainer } from "../../utilities/dom.utils";
import { DetailsPageContext, useDetailsPageContext } from "./context";
import { MediaCard } from "./media-card";
import { MetadataCard } from "./metadata-card";
import { PropertiesCard } from "./properties-card";
import { TagCard } from "./tag-card";

const portal = getPortalContainer("modals");

export function DetailsPage() {
  const loading = useSignal(false);

  return (
    <DrawerLayout className="grid grid-flow-row grid-cols-4 auto-rows-min gap-2">
      <DetailsPageContext>
        <Loading loading={loading}>
          <header className="hidden md:flex col-span-4 justify-between">
            <div>
              <button onClick={() => {
                route(`/`);
              }}>
                <svg className="h-[24px] w-[24px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>back</title><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" /></svg>
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <PostNavigation />
            </div>
          </header>

          <MediaCard className="md:hidden" />
          <PropertiesCard />
          <TagCard />
          <MetadataCard />
          <MediaCard className="hidden md:block"/>
        </Loading>

        <BottomAppBar>
          <BottomAppBar.AppBarHeader>
            <BottomAppBar.AppBarCalloutBtnSlot icon={<ArrowUpLeft />} onClick={() => route('/')} />
            <BottomAppBar.AppBarBtnSlot></BottomAppBar.AppBarBtnSlot>
            <BottomAppBar.AppBarBtnSlot>
              <PostNavigation />
            </BottomAppBar.AppBarBtnSlot>
          </BottomAppBar.AppBarHeader>
        </BottomAppBar>

      </DetailsPageContext>
    </DrawerLayout>
  );
}

function PostNavigation({}: CustomComponent) {
  const { nextPost, prevPost, path, showDeleteModal, post } = useDetailsPageContext();
  
  return (
    <Fragment>
      <button 
        disabled={!prevPost.value} 
        className="disabled:text-burnt-400"
        onClick={() => {
          route(prevPost.value);
          path.value = prevPost.value;
        }}
      >
          <span className="hidden md:inline">Prev</span>
          <ArrowLeft className="md:hidden" />
      </button>

      <ConfirmButton
        label={(<span><span className="hidden md:inline">Delete</span><Trash className="md:hidden" /></span>)}
        confirm={(<span><span className="hidden md:inline">Confirm</span><ShieldAlert className="md:hidden" /></span>)}
        className="text-slate-200 md:text-crown-500 md:border md:border-crown-500"
        confirmClassName="bg-crown-500 text-slate-200"
        onConfirm={() => {
          showDeleteModal.value = true;

          if (post.value?.links.self) {
            deletePost(post.value.links.self)
              .then(() => {
                route(`/?currentPage=${currentPage.value}&refresh=true`);
              })
              .catch((err: Http.ErrorResponse) => {
                showDeleteModal.value = false;
                console.log("Error Deleting");
                console.dir(err);
              });
          }
        }}
      />

      <button 
        disabled={!nextPost.value}
        className="disabled:text-burnt-400"
        onClick={() => {
          route(nextPost.value);
          path.value = nextPost.value;
        }}
      >
        <span className="hidden md:inline">Next</span>
        <ArrowRight className="md:hidden" />
      </button>

      <Modal portal={portal} show={showDeleteModal} disableScrimClose={true}>
        <h3>Deleting Post</h3>
      </Modal>
    </Fragment>
  ) 
}

interface LoadingProps {
  children: ComponentChildren;
  loadingView?: JSX.Element;
  loading: Signal<boolean>;
}

function Loading({ children, loading }: LoadingProps) {
  if (loading.value) {
    return <h2>Loading</h2>;
  }

  return <Fragment>{children}</Fragment>;
}


