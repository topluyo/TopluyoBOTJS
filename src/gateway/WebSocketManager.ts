import WebSocket, { type RawData } from 'ws';
import type { WebSocketManagerOptions } from './types.js';

const DEFAULT_URL = 'wss://topluyo.com/!bot';
const DEFAULT_PING_INTERVAL_MS = 30_000;
const DEFAULT_RECONNECT_BASE_DELAY_MS = 1_000;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 30_000;

export class WebSocketManager {
  private socket: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectEnabled = true;
  private destroyed = false;
  private reconnectCount = 0;

  private readonly url: string;
  private readonly pingIntervalMs: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;

  constructor(
    private readonly options: WebSocketManagerOptions
  ) {
    this.url = options.url ?? DEFAULT_URL;
    this.pingIntervalMs = options.pingIntervalMs ?? DEFAULT_PING_INTERVAL_MS;
    this.reconnectBaseDelayMs =
      options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS;
    this.reconnectMaxDelayMs =
      options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS;
  }

  get ws(): WebSocket | null {
    return this.socket;
  }

  connect(): void {
    if (this.destroyed) {
      throw new Error('Cannot connect a destroyed WebSocketManager.');
    }

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.CONNECTING ||
        this.socket.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.clearReconnectTimer();
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.on('open', () => {
      if (this.socket !== socket || this.destroyed) return;

      socket.send(this.options.token);
      this.reconnectCount = 0;
      this.startPing(socket);
      this.options.dispatcher.emit('open');
    });

    socket.on('message', (data: RawData) => {
      if (this.socket !== socket || this.destroyed) return;
      this.handleMessage(data);
    });

    socket.on('close', () => {
      if (this.socket !== socket) return;

      this.clearPingTimer();
      this.socket = null;
      this.options.dispatcher.emit('close');
      this.scheduleReconnect();
    });

    socket.on('error', (error: Error) => {
      if (this.socket !== socket) return;
      this.options.dispatcher.emit('error', error);
    });
  }

  destroy(): void {
    if (this.destroyed) return;

    this.destroyed = true;
    this.reconnectEnabled = false;
    this.clearPingTimer();
    this.clearReconnectTimer();

    const socket = this.socket;
    socket?.close();
  }

  private handleMessage(data: RawData): void {
    const message = parseMessage(data);
    if (message instanceof Error) {
      this.options.dispatcher.emit('error', message);
      return;
    }

    if (message === 'AUTH_PROBLEM') {
      this.reconnectEnabled = false;
      this.options.dispatcher.emit('auth_problem');
      return;
    }

    if (message === 'CONNECTED') {
      this.reconnectEnabled = true;
      this.options.dispatcher.emit('connected');
      return;
    }

    this.options.dispatcher.dispatchGatewayMessage(message);
  }

  private startPing(socket: WebSocket): void {
    this.clearPingTimer();
    this.pingTimer = setInterval(() => {
      if (this.socket === socket && socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }, this.pingIntervalMs);
  }

  private scheduleReconnect(): void {
    if (this.destroyed || !this.reconnectEnabled || this.reconnectTimer) return;

    const delay = Math.min(
      this.reconnectBaseDelayMs * 2 ** this.reconnectCount,
      this.reconnectMaxDelayMs
    );
    this.reconnectCount += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.destroyed && this.reconnectEnabled) this.connect();
    }, delay);
  }

  private clearPingTimer(): void {
    if (!this.pingTimer) return;
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}

function parseMessage(data: RawData): unknown {
  const messageText = data.toString();

  try {
    return JSON.parse(messageText) as unknown;
  } catch {
    const sanitized = messageText
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    try {
      return JSON.parse(sanitized) as unknown;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return new Error(`JSON parse error on WebSocket message: ${detail}`);
    }
  }
}
