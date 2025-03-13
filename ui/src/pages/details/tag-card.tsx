import { batch, useSignal } from "@preact/signals";
import { AutoComplete, AutocompleteItem } from "../../components/Inputs/Autocomplete";
import { Card } from "../../components/Layouts/Card";
import { Tag } from "../../components/Tag";
import { updateLocalPostTags } from "../../services/post.service";
import { createTag, filterTagsByPost, loadedTags, removeTagFromPost } from "../../services/tags.service";
import { CustomComponent } from "../../utilities/component.utils";
import { useDetailsPageContext } from "./context";

export function TagCard({}: CustomComponent) {
  const { post } = useDetailsPageContext();
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