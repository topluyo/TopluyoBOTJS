export interface RESTRequest {
  api: string;
  data?: Record<string, unknown>;
}

export interface RESTManagerOptions {
  apiEndpoint?: string;
  authToken: string;
  rateLimitMs?: number;
  syncCheckIntervalMs?: number;
  fetcher?: typeof fetch;
}

export type RESTResponse = Record<string, unknown>;

type PendingRequest = {
  request: RESTRequest;
  resolve: (response: RESTResponse) => void;
  reject: (error: Error) => void;
};

export type { PendingRequest };
