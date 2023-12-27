import { getPaged } from "../utilities/http.utils";

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