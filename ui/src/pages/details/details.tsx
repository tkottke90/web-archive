import { Signal, batch, computed, useSignal, useSignalEffect } from "@preact/signals";
import { Card } from "../../components/Layouts/Card";
import { DrawerLayout } from "../../components/Layouts/DrawerLayout";
import { PostDTO } from "../../../../server/src/dto/post.dto";
import { ComponentChildren, Fragment, JSX } from "preact";
import { deletePost, postDetails, updateLocalPost, updateLocalPostTags } from "../../services/post.service";
import { Table } from "../../components/Table/Table";
import { Modal } from "@tkottke90/preact-components";
import { getPortalContainer } from "../../utilities/dom.utils";
import { route } from "preact-router";
import { Http } from "../../interfaces/http.interface";
import { ConfirmButton } from "../../components/Buttons/ConfirmButton";
import { Tag } from "../../components/Tag";
import { AutoComplete, AutocompleteItem } from "../../components/Inputs/Autocomplete";
import { applyTagToPost, createTag, filterTagsByPost, loadedTags, removeTagFromPost } from "../../services/tags.service";
import { PostTagDTO } from "../../../../server/src/dto/post-tag.dto";

const portal = getPortalContainer("modals");

type PostEntity = Signal<PostDTO | undefined>;

export function DetailsPage() {
  const post = useSignal<PostDTO | undefined>(undefined);
  const showDeleteModal = useSignal(false);
  const loading = useSignal(true);

  useSignalEffect(() => {
    postDetails(window.location.pathname).then((result) => {
      batch(() => {
        post.value = result;
        loading.value = false;
      });
    });
  });

  return (
    <DrawerLayout className="grid grid-flow-row grid-cols-4 auto-rows-min gap-2">
      <Loading loading={loading}>
        <div className="col-span-4 flex justify-between">
          <div></div>
          <div>
            <ConfirmButton
              label="Delete"
              className="text-crown-500 border border-crown-500"
              confirmClassName="bg-crown-500 text-slate-200"
              onConfirm={() => {
                showDeleteModal.value = true;

                if (post.value?.self) {
                  deletePost(post.value.self)
                    .then(() => {
                      route("/?refresh=true");
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

function Loading({ children, loading, loadingView }: LoadingProps) {
  if (loading.value) {
    return <h2>Loading</h2>;
  }

  return <Fragment>{children}</Fragment>;
}

function PropertiesCard({ post }: { post: PostEntity }) {
  return (
    <Card className="col-span-3">
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
    <Card className="col-span-1">
      <h4>Tags</h4>
      <br />
      <AutoComplete
        name="new-tag"
        label="Select New Tag"
        filter={filter}
        allowCreate={true}
        onFocus={() => {
          if (post.value)
            filterTagsByPost(post.value?.links.tagSearch, '');
        }}
        onFilterChange={(newFilter) => {
          filter.value = newFilter;

          if (post.value) {
            filterTagsByPost(post.value?.links.tagSearch, newFilter);
          }
        }}
        onCreate={async () => {
          const newTag = await createTag(filter.value);

          console.log(newTag);

          if (post.value) {
            const postTag = await applyTagToPost(post.value?.links.addTag, newTag.id);

            batch(() => {
              updateLocalPostTags(post, postTag.tag_id);
              filter.value = "";
            });
          }
        }}
      >
        {loadedTags.value.map((tag) => (
          <AutocompleteItem
            onSelect={async () => {
              if (post.value) {
                const newTag = await applyTagToPost(post.value?.links.addTag, tag.id);

                batch(() => {
                  updateLocalPostTags(post, newTag.tag_id);
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
    <Card className="col-span-2">
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
  return (
    <Card className="col-span-2">
      <h4>Media</h4>
      <br />
      {!post.value?.files?.length && <p>No Media</p>}

      <div className="grid grid-cols-3 auto-rows-min gap-2">
        {post.value?.files?.map((file, i, fileList) => {
          let commonClasses = "max-h-72";

          if (fileList.length < 2) {
            commonClasses += " col-span-3 m-auto";
          }

          if (file.mime.startsWith("image")) {
            return <img src={file.media} className={commonClasses} />;
          }

          if (file.mime.startsWith("video")) {
            return <video src={file.media} loop controls className={commonClasses} />;
          }
        })}
      </div>
    </Card>
  );
}
