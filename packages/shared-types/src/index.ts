export type Uuid = string;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: unknown[];
    requestId: string;
  };
}

export interface ApiData<T> {
  data: T;
}
