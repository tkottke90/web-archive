import { get, getPaged, remove } from "../utilities/http.utils";
import { PostDTO } from '../../../server/src/dto/post.dto';
import { Signal, batch, effect, computed } from "@preact/signals";

const initialSearch = new URLSearchParams(window.location.search);

const PAGE_SIZE = 10;

export const posts = new Signal<Signal<PostDTO>[]>([])
export const currentPage = new Signal(Number(initialSearch.get('currentPage')) ?? 0);
export const pageCount = new Signal(0);
export const loading = new Signal(true);
export const error = new Signal<string | undefined>();
export const skip = computed(() => {
  return currentPage.value == 0
    ? 0
    : currentPage.value - 1
});

effect(() => {
    loadPosts({ skip: skip.value });
})

interface GetPostInputs {
  limit?: number;
  skip?: number;
}

function getPosts<T>({limit, skip}: GetPostInputs) {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', `${limit ?? 5}`);
  queryParams.append('skip', `${skip ?? 0}`);
  
  return getPaged<T>(`/api/post?${queryParams.toString()}`)
}

export function postDetails(url: string) {
  let post = posts.value.find(post => post.value.self.endsWith(url));

  if (post) {
    return Promise.resolve(post.value);
  }

  return get<PostDTO>(`/api${url}`)
}

export function loadPosts( options: { limit?: number, skip?: number}) {
  getPosts<PostDTO>({ limit: options.limit ?? PAGE_SIZE, skip: (options.skip ?? 0) * PAGE_SIZE })
    .then((data) => {

      batch(() => {
        posts.value = data.data.map(post => new Signal(post));
        currentPage.value = data.pagination.currentPage;
        pageCount.value = data.pagination.totalPages;
      });
    });
}

export function deletePost(url: string) {
  return remove(`/api${url}`);
}