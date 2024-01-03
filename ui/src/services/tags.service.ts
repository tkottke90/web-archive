import { Signal } from "@preact/signals";
import { PostTagDTO, TagDTO } from "../../../server/src/dto/post-tag.dto";
import { get, post, put, remove } from "../utilities/http.utils";
import { PostDTO } from "../../../server/src/dto/post.dto";

export const loadedTags = new Signal<TagDTO[]>([]);

export async function filterTagsByPost(postLink: string, filter: string) {
  const search = new URLSearchParams();

  search.append('limit', '5');
  search.append('label', filter);

  loadedTags.value = await get<TagDTO[]>(`${postLink}?${search.toString()}`)
}

export async function getTags(filter?: string) {
  return await get<TagDTO[]>('/api/tags')
}

export async function applyTagToPost(postLink: string, tagId: number) {
  return await post<unknown, PostTagDTO>(`${postLink}${tagId}`);
}

export async function removeTagFromPost(postTagLink: string) {
  await remove(postTagLink);
}

export async function createTag(tagLabel: string) {
  return await put<{ label: string }, TagDTO>('/api/tags', { label: tagLabel });
}

// Load tags on boot
getTags()
  .then(tags => loadedTags.value = tags);