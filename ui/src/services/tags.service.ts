import { Signal } from '@preact/signals';
import {
  PostTagDTO,
  TagDTO,
  TagUpdateDTO
} from '../../../server/src/dto/post-tag.dto';
import { get, patch, post, put, remove } from '../utilities/http.utils';

export const loadedTags = new Signal<TagDTO[]>([]);

export async function filterTagsByPost(postLink: string, filter: string) {
  const search = new URLSearchParams();

  search.append('limit', '5');
  search.append('label', filter);

  loadedTags.value = await get<TagDTO[]>(`${postLink}?${search.toString()}`);
}

export async function getTags(filter?: string) {
  const query = new URLSearchParams();
  if (filter) {
    query.append('label[contains]', filter);
  }

  return await get<TagDTO[]>(`/api/tags?${query.toString()}`);
}

export async function applyTagToPost(postLink: string, tagId: number) {
  return await post<unknown, PostTagDTO>(
    postLink.replace(':tagId', tagId.toString())
  );
}

export async function removeTagFromPost(postTagLink: string) {
  await remove(postTagLink);
}

export async function createTag(tagLabel: string) {
  return await put<{ label: string }, TagDTO>('/api/tags', { label: tagLabel });
}

export async function updateTag(tagId: number, updates: TagUpdateDTO) {
  const result = await patch<TagUpdateDTO, TagDTO>(
    `/api/tags/${tagId}`,
    updates
  );
  // Refresh the loaded tags signal so all UI reflects the change
  loadedTags.value = await getTags();
  return result;
}

// Load tags on boot
getTags().then((tags) => (loadedTags.value = tags));
