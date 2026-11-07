import { FormInteraction } from '../structure/FormInteraction.js';
import {
  Message,
  type MessageData,
  type MessageSender
} from '../structure/Message.js';
import { User } from '../structure/User.js';
import type { GatewayEventMap, GatewayPayload } from './types.js';

type ListenerRecord = {
  callback: Function;
  once: boolean;
};

const ACTION_EVENTS = new Map<string, string>([
  ['post/add', 'messageCreated'],
  ['post/mention', 'messageCreated'],
  ['message/send', 'messageCreated'],
  ['post/bumote', 'formCreated'],
  ['group/join', 'userGroupJoin'],
  ['group/leave', 'userGroupLeave'],
  ['group/kick', 'userGroupKick']
]);

export class EventDispatcher {
  private readonly listeners = new Map<string, ListenerRecord[]>();

  constructor(
    private readonly listenerContext?: unknown,
    private readonly messageSender?: MessageSender
  ) {}

  on<K extends keyof GatewayEventMap>(
    event: K,
    callback: (...args: GatewayEventMap[K]) => void
  ): this;
  on(event: string, callback: (...args: never[]) => void): this;
  on(event: string, callback: (...args: never[]) => void): this {
    this.addListener(event, callback, false);
    return this;
  }

  once<K extends keyof GatewayEventMap>(
    event: K,
    callback: (...args: GatewayEventMap[K]) => void
  ): this;
  once(event: string, callback: (...args: never[]) => void): this;
  once(event: string, callback: (...args: never[]) => void): this {
    this.addListener(event, callback, true);
    return this;
  }

  off<K extends keyof GatewayEventMap>(
    event: K,
    callback?: (...args: GatewayEventMap[K]) => void
  ): this;
  off(event: string, callback?: (...args: never[]) => void): this;
  off(event: string, callback?: (...args: never[]) => void): this {
    if (!callback) {
      this.listeners.delete(event);
      return this;
    }

    const records = this.listeners.get(event);
    if (!records) return this;

    const remaining = records.filter(record => record.callback !== callback);
    if (remaining.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, remaining);
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    this.invoke(event, args);

    const wildcardRecords = this.listeners.get('*');
    if (!wildcardRecords) return;

    for (const record of [...wildcardRecords]) {
      if (record.once) this.removeRecord('*', record);
      this.callListener(record, [event, ...args]);
    }
  }

  dispatchGatewayMessage(payload: unknown): void {
    this.emit('message', payload);

    if (!isGatewayPayload(payload) || typeof payload.action !== 'string') return;
    const event = ACTION_EVENTS.get(payload.action);
    if (!event) return;

    if (event === 'messageCreated') {
      if (!isMessageData(payload)) {
        this.emit('error', new Error(`Invalid payload for ${payload.action}.`));
        return;
      }
      const message = new Message(payload, this.messageSender);
      this.emit(event, message);
      return;
    }

    if (event === 'formCreated') {
      const messagePayload = isGatewayPayload(payload.message) ? payload.message : {};
      if (
        !isStringRecord(messagePayload.form) ||
        typeof messagePayload.submit !== 'string' ||
        typeof payload.post_id !== 'number' ||
        typeof payload.user_id !== 'number'
      ) {
        this.emit('error', new Error(`Invalid payload for ${payload.action}.`));
        return;
      }
      const interaction = new FormInteraction({
        form: messagePayload.form,
        submit: messagePayload.submit,
        post_id: payload.post_id,
        user_id: payload.user_id
      });
      this.emit(event, interaction);
      return;
    }

    if (
      typeof payload.group_id !== 'number' ||
      typeof payload.user_id !== 'number'
    ) {
      this.emit('error', new Error(`Invalid payload for ${payload.action}.`));
      return;
    }
    this.emit(event, new User({
      group_id: payload.group_id,
      user_id: payload.user_id
    }));
  }

  private addListener(
    event: string,
    callback: Function,
    once: boolean
  ): void {
    const records = this.listeners.get(event) ?? [];
    records.push({ callback, once });
    this.listeners.set(event, records);
  }

  private invoke(event: string, args: unknown[]): void {
    const records = this.listeners.get(event);
    if (!records) return;

    for (const record of [...records]) {
      if (record.once) this.removeRecord(event, record);
      this.callListener(record, args);
    }
  }

  private callListener(record: ListenerRecord, args: unknown[]): void {
    Reflect.apply(record.callback, this.listenerContext, args);
  }

  private removeRecord(event: string, target: ListenerRecord): void {
    const records = this.listeners.get(event);
    if (!records) return;

    const remaining = records.filter(record => record !== target);
    if (remaining.length === 0) {
      this.listeners.delete(event);
    } else {
      this.listeners.set(event, remaining);
    }
  }
}

function isGatewayPayload(value: unknown): value is GatewayPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isGatewayPayload(value) &&
    Object.values(value).every(item => typeof item === 'string');
}

function isMessageData(payload: GatewayPayload): payload is GatewayPayload & MessageData {
  return (
    (payload.action === 'post/add' ||
      payload.action === 'post/mention' ||
      payload.action === 'message/send') &&
    typeof payload.message === 'string' &&
    typeof payload.user_id === 'number' &&
    (payload.channel_id === undefined || typeof payload.channel_id === 'string')
  );
}
