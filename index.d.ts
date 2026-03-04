/// <reference types="node" />

import WebSocket = require('ws');

/**
 * Represents the bot instance returned by TopluyoBOT()
 */
export interface BotInstance {
  /** The underlying WebSocket connection */
  ws: WebSocket;

  /**
   * Send a single API request to the Topluyo platform
   * @param api  API endpoint name
   * @param data Request payload
   */
  post(api: string, data?: Record<string, any>): Promise<any>;

  /** Fired when the WebSocket connection is opened */
  on(event: 'open', callback: (this: BotInstance) => void): void;
  /** Fired when the bot is successfully authenticated */
  on(event: 'connected', callback: (this: BotInstance) => void): void;
  /** Fired when the WebSocket connection is closed */
  on(event: 'close', callback: (this: BotInstance) => void): void;
  /** Fired when authentication fails */
  on(event: 'auth_problem', callback: (this: BotInstance) => void): void;
  /** Fired when a message is received */
  on(event: 'message', callback: (this: BotInstance, data: any) => void): void;
  /** Fired when a WebSocket error occurs */
  on(event: 'error', callback: (this: BotInstance, err: Error) => void): void;
  /**
   * Wildcard listener — receives all events.
   * The first argument is the event name, the second is the event data.
   */
  on(event: '*', callback: (this: BotInstance, event: string, data: any) => void): void;

  /** Opens the WebSocket connection (called automatically on construction) */
  connect(): void;
}

/**
 * Creates and connects a new TopluyoBOT instance
 * @param token Bot authentication token
 * @returns     Connected BotInstance
 *
 * @example
 * // CommonJS
 * const TopluyoBOT = require('topluyo-bot');
 * const bot = TopluyoBOT('your-token');
 *
 * bot.on('message', function(data) {
 *   console.log(data);
 * });
 */
declare function TopluyoBOT(token: string): BotInstance;

export = TopluyoBOT;
