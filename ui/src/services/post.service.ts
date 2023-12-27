import { getPaged } from "../utilities/http.utils";
import { PostDTO } from '../../../server/src/dto/post.dto';
import { Signal, batch, effect } from "@preact/signals";

const PAGE_SIZE = 10;

export const posts = new Signal<Signal<PostDTO>[]>([])
export const currentPage = new Signal(0);
export const pageCount = new Signal(0);
export const loading = new Signal(true);
export const error = new Signal<string | undefined>();

effect(() => {
  const skip = currentPage.value == 0
    ? 0
    : currentPage.value - 1

  getPosts<PostDTO>({ limit: PAGE_SIZE, skip: skip * PAGE_SIZE }).then((data) => {

    batch(() => {
      posts.value = data.data.map(post => new Signal(post));
      currentPage.value = data.pagination.currentPage;
      pageCount.value = data.pagination.totalPages;
    });
  });
})

interface GetPostInputs {
  limit?: number;
  skip?: number;
}

export function getPosts<T>({limit, skip}: GetPostInputs) {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', `${limit ?? 5}`);
  queryParams.append('skip', `${skip ?? 0}`);
  
  return getPaged<T>(`/api/post?${queryParams.toString()}`)
}