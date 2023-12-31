import { Signal } from "@preact/signals";
import { TagDTO } from "../../../server/src/dto/post-tag.dto";
import { get, post, remove } from "../utilities/http.utils";
import { PostDTO } from "../../../server/src/dto/post.dto";

export const loadedTags = new Signal<TagDTO[]>([]);

export async function filterTagsByPost(postLink: string, filter: string) {
  const search = new URLSearchParams();

  search.append('limit', '5');
  search.append('label', filter);

  console.log(postLink);

  loadedTags.value = await get<TagDTO[]>(`${postLink}?${search.toString()}`)
}

export async function applyTagToPost(postLink: string, tagId: number) {
  return await post(`${postLink}/${tagId}`);
}

export async function removeTagFromPost(postTagLink: string) {
  await remove(postTagLink);
}

export async function createTag() {}