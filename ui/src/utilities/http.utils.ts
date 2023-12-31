import { Http } from "../interfaces/http.interface";

export function parseQuery<T>(q: Http.SharedQueryParams<T>) {
  const $query: Http.SharedQueryParams<T> = {};
  Object.entries(q).forEach(([key, item]) => {
    if (Array.isArray(item)) {
      // If an array, only send if it has useful stuff in it
      if (item.length > 0 && item.some(Boolean)) {
        for (let i = 0; i < item.length; i++) {
          $query[`${key}[${i}]`] = item[i] || ''
        }
      }
    } else if (item) {
      $query[key] = item;
    }
  })

  return $query;
}

async function parseTextResponse(res: Response) {
  if (!res.ok) {
    const err: Http.ErrorResponse = {
      code: res.status,
      error: res.statusText,
      url: res.url,
      data: await res.json()
    };

    throw err;
  }

  return res.text();
}

async function parseResponse<T>(res: Response) {
  if (!res.ok) {
    const err: Http.ErrorResponse = {
      code: res.status,
      error: res.statusText,
      url: res.url,
      data: await res.json()
    };

    throw err;
  }

  return res.json() as Promise<T>;
}

async function parsePagedResponse<T>(res: Response) {
  if (!res.ok) {
    const err: Http.ErrorResponse = {
      code: res.status,
      error: res.statusText,
      url: res.url,
      data: await res.json()
    };

    throw err;
  }

  return res.json() as Promise<Http.PaginatedResponse<T>>;
}

export function get<T>(path: string, init?: RequestInit) {
  return fetch(path, init).then(parseResponse<T>);
}

export function getPaged<T>(path: string, init?: RequestInit) {
  return fetch(path, init).then(parsePagedResponse<T>);
}

export function post<T>(path: string, body?: T, init?: RequestInit) {
  const headers = new Headers();

  headers.append('Content-Type', 'application/json');
  
  return fetch(
    path,
    { 
      ...init,
      headers,
      body: JSON.stringify(body),
      method: 'POST'
    }
  ).then(parseResponse<T>);
}

export function remove(path: string, init?: RequestInit) {
  return fetch(path, Object.assign({}, init, { method: 'DELETE' })).then(parseTextResponse);
}