export interface WxtRequest<T = unknown> {
  type: RequestType;
  data?: T;
}

export type DownloadRequest = WxtRequest<{
  url?: string;
  filename?: string;
}>;

export interface WxtResponse<T = unknown> {
  status: Status;
  data?: T;
}
