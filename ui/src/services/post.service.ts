import { Signal, batch, computed, effect } from '@preact/signals';
import { PostDTO } from '../../../server/src/dto/post.dto';
import { get, getPaged, postMultipart, remove } from '../utilities/http.utils';
import { applyTagToPost } from './tags.service';
import { Http } from '../interfaces/http.interface';

type OptionalPath = string | undefined;

type NavigationResponse = { navigation: [OptionalPath, string, OptionalPath], pagination: Http.Pagination }

const initialSearch = new URLSearchParams(window.location.search);

const PAGE_SIZE = 10;

export const posts = new Signal<Signal<PostDTO>[]>([]);
export const currentPage = new Signal(
  Number(initialSearch.get('currentPage')) ?? 0
);
export const pageCount = new Signal(0);
export const loading = new Signal(true);
export const error = new Signal<string | undefined>();
export const skip = computed(() => {
  return currentPage.value == 0 ? 0 : currentPage.value - 1;
});

effect(() => {
  loadPosts({ skip: skip.value });
});

interface GetPostInputs {
  limit?: number;
  skip?: number;
}

function getPosts<T>({ limit, skip }: GetPostInputs) {
  const queryParams = new URLSearchParams();
  queryParams.append('limit', `${limit ?? 5}`);
  queryParams.append('skip', `${skip ?? 0}`);

  return getPaged<T>(`/api/post?${queryParams.toString()}`);
}

export async function getSiblingPosts(id: number) {
  const queryParams = new URLSearchParams(initialSearch);
  queryParams.set('limit', `${PAGE_SIZE}`);
  queryParams.set('cursor', `${id}`);
  queryParams.delete('currentPage')

  const response = await get<NavigationResponse>(
    `/api/post/${id}/navigation?${queryParams.toString()}`
  );

  currentPage.value = response.pagination.currentPage - 1;
  pageCount.value = response.pagination.totalPages;

  return {
    previous: response.navigation[0] ?? '',
    next: response.navigation[2] ?? ''
  };
}

export function postDetails(url: string) {
  let post = posts.value.find((post) => post.value.links.self.endsWith(url));

  if (post) {
    return Promise.resolve(post.value);
  }

  return get<PostDTO>(`/api${url}`);
}

export function loadPosts(options: { limit?: number; skip?: number }) {
  getPosts<PostDTO>({
    limit: options.limit ?? PAGE_SIZE,
    skip: (options.skip ?? 0) * PAGE_SIZE
  }).then((data) => {
    batch(() => {
      posts.value = data.data.map((post) => new Signal(post));
      currentPage.value = data.pagination.currentPage;
      pageCount.value = data.pagination.totalPages;
    });
  });
}

export function updateLocalPost(post: PostDTO) {
  const targetIndex = posts.value.findIndex((postSignal) => {
    postSignal.value.links.self === post.links.self;
  });

  if (targetIndex != -1) {
    posts.value[targetIndex].value = post;
  }
}

export async function updateLocalPostTags(
  post: Signal<PostDTO | undefined>,
  tagId: number
) {
  if (!post.value) {
    console.log('No Post');
    return;
  }

  const postTag = await applyTagToPost(post.value.links.addTag, tagId);

  if (post.value.tags) {
    post.value.tags.push(postTag);
    post.value.tags.sort((tagA, tagB) => (tagA.value > tagB.value ? 1 : -1));
  } else {
    post.value.tags = [postTag];
  }

  post.value = structuredClone(post.value);
}

export async function uploadFilesToPost(
  post: Signal<PostDTO | undefined>,
  files: File[]
) {
  if (!post.value) {
    throw new Error('No post loaded');
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('file', file));

  const updatedPost = await postMultipart<PostDTO>(post.value.links.files, formData);
  post.value = updatedPost;
}

export function deletePost(url: string) {
  return remove(`${url}?archive=true`);
}
