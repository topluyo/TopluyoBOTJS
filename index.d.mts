/// <reference types="node" />

import type WebSocket from 'ws';

// ---------------------------------------------------------------------------
// Message payload interfaces
// ---------------------------------------------------------------------------

/** Fired when a new post is sent in a channel (action: 'post/add') */
export interface PostAddMessage {
  action: 'post/add';
  /** The text content of the post */
  message: string;
  /** The channel the post was sent in */
  channel_id: string;
  /** ID of the user who sent the post */
  user_id: number;
}

/** Fired when the bot is mentioned in a post (action: 'post/mention') */
export interface PostMentionMessage {
  action: 'post/mention';
  /** The text content of the post containing the mention */
  message: string;
  /** The channel the mention occurred in */
  channel_id: string;
  /** ID of the user who mentioned the bot */
  user_id: number;
}

/** Fired when a user submits a bumote form on a post (action: 'post/bumote') */
export interface PostBumoteMessage {
  action: 'post/bumote';
  /** Contains the submitted form fields and submit button label */
  message: {
    /** Key/value pairs of form fields (e.g. `{ name: 'Hasan', burc: 'Koç' }`) */
    form: Record<string, string>;
    /** Label of the submit button */
    submit: string;
  };
  /** ID of the post the bumote was submitted on */
  post_id: number;
  /** ID of the user who submitted the form */
  user_id: number;
}

/** Fired when a user sends a direct message (action: 'message/send') */
export interface MessageSendMessage {
  action: 'message/send';
  /** The text content of the message */
  message: string;
  /** ID of the user who sent the message */
  user_id: number;
}

/** Fired when a user joins the group (action: 'group/join') */
export interface GroupJoinMessage {
  action: 'group/join';
  /** ID of the group */
  group_id: number;
  /** ID of the user who joined */
  user_id: number;
}

/** Fired when a user leaves the group (action: 'group/leave') */
export interface GroupLeaveMessage {
  action: 'group/leave';
  /** ID of the group */
  group_id: number;
  /** ID of the user who left */
  user_id: number;
}

/** Fired when a user is kicked from the group (action: 'group/kick') */
export interface GroupKickMessage {
  action: 'group/kick';
  /** ID of the group */
  group_id: number;
  /** ID of the user who was kicked */
  user_id: number;
}

/** Fired when a turbo transfer is made to the bot (action: 'turbo/transfer') */
export interface TurboTransferMessage {
  action: 'turbo/transfer';
  message: {
    /** Optional note/message attached to the transfer */
    message: string;
    /** Amount of turbo transferred */
    quantity: number;
  };
  /** ID of the transfer */
  transfer_id: number;
  /** ID of the user who sent the transfer */
  user_id: number;
}

/** Union of all possible message payloads received via bot.on('message', ...) */
export type BotMessage =
  | PostAddMessage
  | PostMentionMessage
  | PostBumoteMessage
  | MessageSendMessage
  | GroupJoinMessage
  | GroupLeaveMessage
  | GroupKickMessage
  | TurboTransferMessage;

// ---------------------------------------------------------------------------

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
  /**
   * Fired when a message or event is received from the server.
   * Use `data.action` to distinguish between event types:
   * `'post/add'` | `'post/bumote'` | `'message/send'` | `'group/join'` | `'group/leave'` | `'group/kick'`
   */
  on(event: 'message', callback: (this: BotInstance, data: BotMessage) => void): void;
  /** Fired when a WebSocket error occurs */
  on(event: 'error', callback: (this: BotInstance, err: Error) => void): void;
  /**
   * Wildcard listener — receives all events.
   * The first argument is the event name, the second is the event data.
   */
  on(event: '*', callback: (this: BotInstance, event: string, data: BotMessage | Error | undefined) => void): void;

  /** Opens the WebSocket connection (called automatically on construction) */
  connect(): void;
}

/**
 * Creates and connects a new TopluyoBOT instance
 * @param token Bot authentication token
 * @returns     Connected BotInstance
 *
 * @example
 * // ES Module
 * import TopluyoBOT from 'topluyo-bot';
 * const bot = TopluyoBOT('your-token');
 *
 * bot.on('message', function(data) {
 *   console.log(data);
 * });
 */
declare function TopluyoBOT(token: string): BotInstance;

export { TopluyoBOT };
export default TopluyoBOT;
