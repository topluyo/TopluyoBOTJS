import { EventDispatcher } from '../gateway/EventDispatcher.js';
import { WebSocketManager } from '../gateway/WebSocketManager.js';
import type {
  GatewayEventMap,
  GatewayPayload,
  WebSocketManagerOptions
} from '../gateway/types.js';
import { RESTManager } from '../rest/RESTManager.js';
import type { RESTManagerOptions, RESTResponse } from '../rest/types.js';

export interface TopluyoClientOptions {
  apiEndpoint?: string;
  gatewayUrl?: string;
  pingIntervalMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  rateLimitMs?: number;
  syncCheckIntervalMs?: number;
  fetcher?: typeof fetch;
}

export class TopluyoClient {
  readonly events: EventDispatcher;
  readonly rest: RESTManager;
  readonly gateway: WebSocketManager;

  constructor(
    readonly token: string,
    options: TopluyoClientOptions = {}
  ) {
    if (typeof token !== 'string' || token.length === 0) {
      throw new TypeError('A non-empty bot token is required.');
    }

    this.events = new EventDispatcher(this, (api, data) => this.post(api, data));

    const restOptions: RESTManagerOptions = {
      authToken: token,
      apiEndpoint: options.apiEndpoint,
      rateLimitMs: options.rateLimitMs,
      syncCheckIntervalMs: options.syncCheckIntervalMs,
      fetcher: options.fetcher
    };
    this.rest = new RESTManager(restOptions);

    const gatewayOptions: WebSocketManagerOptions = {
      token,
      dispatcher: this.events,
      url: options.gatewayUrl,
      pingIntervalMs: options.pingIntervalMs,
      reconnectBaseDelayMs: options.reconnectBaseDelayMs,
      reconnectMaxDelayMs: options.reconnectMaxDelayMs
    };
    this.gateway = new WebSocketManager(gatewayOptions);
    this.connect();
  }

  get ws(): WebSocketManager['ws'] {
    return this.gateway.ws;
  }

  on<K extends keyof GatewayEventMap>(
    event: K,
    callback: (...args: GatewayEventMap[K]) => void
  ): this;
  on(event: string, callback: (...args: never[]) => void): this;
  on(event: string, callback: (...args: never[]) => void): this {
    this.events.on(event, callback);
    return this;
  }

  once<K extends keyof GatewayEventMap>(
    event: K,
    callback: (...args: GatewayEventMap[K]) => void
  ): this;
  once(event: string, callback: (...args: never[]) => void): this;
  once(event: string, callback: (...args: never[]) => void): this {
    this.events.once(event, callback);
    return this;
  }

  off<K extends keyof GatewayEventMap>(
    event: K,
    callback?: (...args: GatewayEventMap[K]) => void
  ): this;
  off(event: string, callback?: (...args: never[]) => void): this;
  off(event: string, callback?: (...args: never[]) => void): this {
    this.events.off(event, callback);
    return this;
  }

  post(api: string, data: Record<string, unknown> = {}): Promise<RESTResponse> {
    return this.rest.post(api, data);
  }

  connect(): this {
    this.gateway.connect();
    return this;
  }

  destroy(): void {
    this.gateway.destroy();
    this.rest.destroy();
  }
}

export type BotInstance = TopluyoClient;

export type { GatewayPayload };
