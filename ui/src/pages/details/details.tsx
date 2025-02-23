import { Signal, batch, useSignal, useSignalEffect } from "@preact/signals";
import { Modal } from "@tkottke90/preact-components";
import { ComponentChildren, Fragment, JSX } from "preact";
import { route } from "preact-router";
import { PostDTO } from "../../../../server/src/dto/post.dto";
import { ConfirmButton } from "../../components/Buttons/ConfirmButton";
import { EmptyVideo } from "../../components/EmptyAsset";
import { AutoComplete, AutocompleteItem } from "../../components/Inputs/Autocomplete";
import { Card } from "../../components/Layouts/Card";
import { DrawerLayout } from "../../components/Layouts/DrawerLayout";
import { Table } from "../../components/Table/Table";
import { Tag } from "../../components/Tag";
import { Http } from "../../interfaces/http.interface";
import { currentPage, deletePost, getSiblingPosts, postDetails, updateLocalPostTags } from "../../services/post.service";
import { createTag, filterTagsByPost, loadedTags, removeTagFromPost } from "../../services/tags.service";
import { getPortalContainer } from "../../utilities/dom.utils";
import { returnFileSize } from "../../utilities/number.utils";
import { useAsyncResource } from "../../components/Layouts/AsyncResource";
import { useEffect } from "preact/hooks";

const portal = getPortalContainer("modals");

type PostEntity = Signal<PostDTO | undefined>;

export function DetailsPage() {
  const path = useSignal(window.location.pathname);
  const post = useSignal<PostDTO | undefined>(undefined);
  const showDeleteModal = useSignal(false);
  const loading = useSignal(true);
  const siblings = useSignal({ next: '', previous: '' })

  useSignalEffect(() => {
    loading.value = true;
    postDetails(path.value).then(async (result) => {
      const newSiblings = await getSiblingPosts(result.id)

      batch(() => {
        post.value = result;
        loading.value = false;
        siblings.value = newSiblings;
      });
    });
  });

  return (
    <DrawerLayout className="grid grid-flow-row grid-cols-4 auto-rows-min gap-2">
      <Loading loading={loading}>
        <div className="col-span-4 flex justify-between">
          <div>
            <button onClick={() => {
              route(`/`);
            }}>
              <svg className="h-[24px] w-[24px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>back</title><path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" /></svg>
            </button>
          </div>
          <div>
              <button disabled={!siblings.value.previous} onClick={() => {
                route(siblings.value.previous);
                path.value = siblings.value.previous;
              }}>Prev</button>
              <button disabled={!siblings.value.next} onClick={() => {
                route(siblings.value.next);
                path.value = siblings.value.next;
              }}>Next</button>
            <ConfirmButton
              label="Delete"
              className="text-crown-500 border border-crown-500"
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
          </div>
        </div>
        <PropertiesCard post={post} />
        <TagCard post={post} />
        <MetadataCard post={post} />
        <MediaCard post={post} />
      </Loading>
      <Modal portal={portal} show={showDeleteModal} disableScrimClose={true}>
        <h3>Deleting Post</h3>
      </Modal>
    </DrawerLayout>
  );
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

function PropertiesCard({ post }: { post: PostEntity }) {
  return (
    <Card className="col-span-4 md:col-span-3">
      <h2>Post Details</h2>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <label htmlFor="label">Label</label>
          <input value={post.value?.label} className="w-full" />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="label">Author</label>
          <input value={post.value?.author} className="w-full" />
        </div>

        <div className="flex gap-2 items-center">
          <label htmlFor="label">Source</label>
          <input value={post.value?.source} className="w-full" />
        </div>
      </div>
    </Card>
  );
}

function TagCard({ post }: { post: PostEntity }) {
  const filter = useSignal("");

  return (
    <Card className="col-span-4 md:col-span-1">
      <h4>Tags</h4>
      <br />
      <AutoComplete
        name="new-tag"
        label="Select New Tag"
        filter={filter}
        allowCreate={true}
        onFocus={() => {
          if (post.value)
            filterTagsByPost(post.value?.links.tags, '');
        }}
        onFilterChange={(newFilter) => {
          filter.value = newFilter;

          if (post.value) {
            filterTagsByPost(post.value?.links.tags, newFilter);
          }
        }}
        onCreate={async () => {
          const newTag = await createTag(filter.value);
          
          if (post.value) {
            batch(() => {
              updateLocalPostTags(post, newTag.id)
              filter.value = "";
            });
          }
        }}
      >
        {loadedTags.value.map((tag) => (
          <AutocompleteItem
            onSelect={async () => {
              if (post.value) {
                batch(() => {
                  updateLocalPostTags(post, tag.id);
                  filter.value = "";
                });

                // updateLocalPost(post.value);
                // TODO-Snackbar: Add snackbar message on deletion
              }
            }}
          >
            {tag.label}
          </AutocompleteItem>
        ))}
      </AutoComplete>
      <br />
      <div className="flex flex-wrap gap-px">
        {post.value?.tags?.map((tag, index) => (
          <Tag
            onRemove={async () => {
              await removeTagFromPost(tag.links.removeTag);

              if (post.value?.tags?.length) {
                post.value.tags.splice(index, 1);
                post.value = structuredClone(post.value);
                // updateLocalPost(post.value);
              }
            }}
          >
            {tag.value}
          </Tag>
        ))}
      </div>
    </Card>
  );
}

function MetadataCard({ post }: { post: PostEntity }) {
  if (!post?.value?.metadata) {
    return null;
  }

  return (
    <Card className="col-span-4 md:col-span-2">
      <h4>Metadata</h4>

      <Table
        entries={(post.value?.metadata).map((item) => new Signal(item))}
        headers={[
          { key: "name", label: "Name", className: "font-bold" },
          { key: "value", label: "Value", className: "text-ellipsis overflow-hidden" },
        ]}
      ></Table>
    </Card>
  );
}

function MediaCard({ post }: { post: PostEntity }) {
  const showAddModal = useSignal(false);
  const fileQueue = useSignal<File[]>([]);

  const TextLoader = useAsyncResource();


  useSignalEffect(() => {
    if (!showAddModal.value) {
      fileQueue.value = [];
    }
  });

  return (
    <Card className="col-span-4 md:col-span-2">
      <div className="flex justify-between">
        <h4>Media</h4>
        <div>
          <button className="rounded-full hover:bg-stone-400 p-2" onClick={() => showAddModal.value = true}>
            <svg className="w-6 h-6 cursor-pointer hover:brightness-150" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>plus</title><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" /></svg>
          </button>
        </div>
      </div>
      <br />
      {!post.value?.files?.length && <p>No Media</p>}

      <div className="grid grid-cols-3 auto-rows-min gap-2">
        {post.value?.files?.map((file, i, fileList) => {
          let commonClasses = "max-h-72";

          if (fileList.length < 2) {
            commonClasses += " col-span-3 m-auto";
          }

          if (file.mime.startsWith("image")) {
            return <img key={`details-media-img-${i}`} src={file.links.media} className={commonClasses} />;
          }

          if (file.mime.startsWith("video")) {
            return file.size > 0
              ? <video key={`details-media-vid-${i}`} src={file.links.media} loop controls className={commonClasses} />
              : <EmptyVideo className={commonClasses} />
          }

          if (file.mime.startsWith('text')) {
            const key = `details-media-text-${i}`;
            const textValue = useSignal('');

            useEffect(() => {
              TextLoader.execute<string>(fetch(file.links.media)
                .then(async res => textValue.value = await res.text()))
            });

            return (
              <TextLoader.Provider key={key} >
                <pre className="whitespace-pre-wrap p-2 overflow-hidden" >{ textValue }</pre>
              </TextLoader.Provider>
            )
          }
        })}
      </div>
      <Modal portal={portal} show={showAddModal} className="p-4">
        <h3>Upload File</h3>
        <br />
        <label
          htmlFor="file-input"
          className="flex flex-col justify-center items-center min-w-[500px] min-h-40 border-dashed border-2 border-slate-500 rounded relative cursor-pointer transition-transform"
          onDragEnter={e => {
            e.preventDefault();
            const target = e.target as HTMLInputElement;

            target.classList.add('scale-[1.02]');
          }}
          onDragLeave={e => {
            e.preventDefault();
            const target = e.target as HTMLInputElement;

            target.classList.remove('scale-[1.02]');
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();

            if (e.dataTransfer?.files) {
              const { files } = e.dataTransfer;

              fileQueue.value = [...fileQueue.value, ...files];
            } else {
              console.group('missingFiles');
              console.warn('No Files');
              console.dir(e.dataTransfer);
              console.groupEnd();
            }
          }}
        >
          <p className={["z-40 absolute text-4xl transition-opacity", fileQueue.value.length === 0 ? 'opacity-50' : 'opacity-5'].join(' ')}>Click to Upload or Drag a File</p>
          <div className="z-50 w-[90%]">
            {fileQueue.value.length > 0 && fileQueue.value.map((file, index) => (
              <div className="flex justify-between w-full">
                <p>{file.name}</p>
                <p>{returnFileSize(file.size)}</p>
                <svg
                  onClick={(e) => {
                    e.preventDefault();

                    const newQueue = [...fileQueue.value];
                    newQueue.splice(index, 1);

                    fileQueue.value = newQueue;
                  }}
                  className="w-[24px] h-[24px] "
                xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>close</title><path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" /></svg>
              </div>
            ))}
          </div>
          <input multiple onChange={(e) => {
            const input = e.target as HTMLInputElement;

            if (input.files) {
              fileQueue.value = [...fileQueue.value, ...input.files];
            }
          }} id="file-input" type="file" className="hidden" />
        </label>
        <br />
        <div className="actions">
          <button onClick={() => {
            const { value } = fileQueue;
            console.dir(value);

          }} className="primary">Upload</button>
        </div>
      </Modal>
    </Card>
  );
}
