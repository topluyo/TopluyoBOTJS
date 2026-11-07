import type { FormInteraction } from '../structure/FormInteraction.js';
import type { Message } from '../structure/Message.js';
import type { User } from '../structure/User.js';

export type GatewayEventName =
  | 'open'
  | 'connected'
  | 'close'
  | 'auth_problem'
  | 'message'
  | 'messageCreated'
  | 'formCreated'
  | 'userGroupJoin'
  | 'userGroupLeave'
  | 'userGroupKick'
  | 'error'
  | '*';

export type GatewayPayload = Record<string, unknown>;
export type MessageCreatedPayload = Message;
export type FormCreatedPayload = FormInteraction;
export type GroupEventPayload = User;

export interface GatewayEventMap {
  open: [];
  connected: [];
  close: [];
  auth_problem: [];
  error: [error: Error];
  message: [payload: GatewayPayload];
  messageCreated: [message: Message];
  formCreated: [interaction: FormInteraction];
  userGroupJoin: [user: User];
  userGroupLeave: [user: User];
  userGroupKick: [user: User];
  '*': [event: string, ...args: unknown[]];
}

export type GatewayListener = (...args: unknown[]) => void;

export type GatewayEventListener = (
  event: string,
  ...args: unknown[]
) => void;

export interface GatewayDispatcher {
  emit(event: string, ...args: unknown[]): void;
  dispatchGatewayMessage(payload: unknown): void;
}

export interface WebSocketManagerOptions {
  token: string;
  dispatcher: GatewayDispatcher;
  url?: string;
  pingIntervalMs?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
}
