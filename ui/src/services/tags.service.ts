import { Signal } from "@preact/signals";
import { TagDTO } from "../../../server/src/dto/post-tag.dto";
import { get } from "../utilities/http.utils";

export const loadedTags = new Signal<TagDTO[]>([]);

export async function filterTagsByPost(filter: string) {
  const search = new URLSearchParams();

  search.append('limit', '5');
  search.append('label', filter);

  loadedTags.value = await get<TagDTO[]>(`/api/tags?${search.toString()}`)
}

export function createTag() {}