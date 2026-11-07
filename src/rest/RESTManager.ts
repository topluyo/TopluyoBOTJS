import type {
  PendingRequest,
  RESTManagerOptions,
  RESTRequest,
  RESTResponse
} from './types.js';

const DEFAULT_API_ENDPOINT = 'https://topluyo.com/';
const DEFAULT_RATE_LIMIT_MS = 1_000;
const DEFAULT_SYNC_CHECK_INTERVAL_MS = 200;

export class RESTManager {
  private readonly apiEndpoint: string;
  private readonly rateLimitMs: number;
  private readonly fetcher: typeof fetch;
  private readonly pending: PendingRequest[] = [];
  private readonly syncInterval: ReturnType<typeof setInterval>;
  private lastSyncTime = Date.now();
  private syncing = false;
  private destroyed = false;

  constructor(private readonly options: RESTManagerOptions) {
    this.apiEndpoint = options.apiEndpoint ?? DEFAULT_API_ENDPOINT;
    this.rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    this.fetcher = options.fetcher ?? fetch;
    this.syncInterval = setInterval(
      () => this.autoSync(),
      options.syncCheckIntervalMs ?? DEFAULT_SYNC_CHECK_INTERVAL_MS
    );
  }

  post(api: string, data: Record<string, unknown> = {}): Promise<RESTResponse> {
    return this.api({ api, data });
  }

  api(request: RESTRequest): Promise<RESTResponse>;
  api(requests: RESTRequest[]): Promise<RESTResponse[]>;
  api(requestOrRequests: RESTRequest | RESTRequest[]): Promise<RESTResponse | RESTResponse[]> {
    if (this.destroyed) {
      return Promise.reject(new Error('Cannot queue requests on a destroyed RESTManager.'));
    }

    if (Array.isArray(requestOrRequests)) {
      if (requestOrRequests.length === 0) return Promise.resolve([]);
      return Promise.all(requestOrRequests.map(request => this.queueRequest(request)));
    }

    return this.queueRequest(requestOrRequests);
  }

  async sync(): Promise<void> {
    if (this.syncing || this.pending.length === 0) return;

    this.syncing = true;
    const batch = this.pending.splice(0);

    try {
      const body = batch.map(({ request }, index) => {
        if (!request || typeof request.api !== 'string' || request.api.length === 0) {
          throw new Error(`Invalid request format at index ${index}: missing api endpoint.`);
        }

        return {
          api: request.api,
          data: request.data ?? {}
        };
      });

      const response = await this.fetcher(`${this.apiEndpoint}!apis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.options.authToken}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const json: unknown = await response.json();
      const results = extractResults(json, batch.length);
      batch.forEach((pending, index) => {
        const result = results[index];
        if (!isRESTResponse(result)) {
          pending.reject(new Error('Missing or invalid response from server'));
        } else if (typeof result.error === 'string' && result.error.length > 0) {
          pending.reject(new Error(result.error));
        } else {
          pending.resolve(result);
        }
      });
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      for (const pending of batch) pending.reject(error);
    } finally {
      this.syncing = false;
      this.lastSyncTime = Date.now();
    }
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    clearInterval(this.syncInterval);
    const error = new Error('RESTManager was destroyed before the request was sent.');
    for (const pending of this.pending.splice(0)) pending.reject(error);
  }

  private queueRequest(request: RESTRequest): Promise<RESTResponse> {
    return new Promise((resolve, reject) => {
      this.pending.push({ request, resolve, reject });
    });
  }

  private autoSync(): void {
    if (
      this.destroyed ||
      this.syncing ||
      this.pending.length === 0 ||
      Date.now() - this.lastSyncTime <= this.rateLimitMs
    ) {
      return;
    }

    this.lastSyncTime = Date.now();
    void this.sync();
  }
}

function extractResults(json: unknown, expectedLength: number): unknown[] {
  if (
    !isRESTResponse(json) ||
    (!Array.isArray(json.data) && !isRESTResponse(json.data))
  ) {
    throw new Error('Invalid batch response from server: missing data object.');
  }

  const data = json.data;
  const results: unknown[] = [];
  for (let index = 0; index < expectedLength; index += 1) {
    results.push(Array.isArray(data) ? data[index] : data[String(index)]);
  }
  return results;
}

function isRESTResponse(value: unknown): value is RESTResponse {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
