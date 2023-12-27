export namespace Http {
  export interface SharedQueryParams<T> extends Record<string, any> {
    limit?: number;
    page?: number;
    sort?: keyof T;
    sortDirection?: 'ASC' | 'DESC' | 'NULLS FIRST';
    select?: Array<keyof T>;
  }

  export type QueryInterface<T> = Partial<T> & Http.SharedQueryParams<T>;

  export interface Pagination {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  }

  export interface PaginatedResponse<T> {
    type: 'response'
    pagination: Pagination,
    data: T[]
  }

  export interface ErrorResponse {
    code: number;
    error: string;
    url: string;
    data: Record<string, any>;
  }
}