import type { RESTResponse } from '../rest/types.js';

export type MessageAction = 'post/add' | 'post/mention' | 'message/send';

export interface SendMessageOptions {
  channel_id?: string;
  text: string;
}

export type MessageSender = (
  api: string,
  data: Record<string, unknown>
) => Promise<RESTResponse>;

export interface MessageData {
  action: MessageAction;
  message: string;
  channel_id?: string;
  user_id: number;
}

export class Message implements MessageData {
  readonly action: MessageAction;
  readonly message: string;
  readonly channel_id?: string;
  readonly user_id: number;

  constructor(data: MessageData, private readonly sender?: MessageSender) {
    this.action = data.action;
    this.message = data.message;
    this.channel_id = data.channel_id;
    this.user_id = data.user_id;
  }

  send(message: string | SendMessageOptions): Promise<RESTResponse> {
    if (!this.sender) {
      return Promise.reject(new Error('Message sending is unavailable.'));
    }

    const options = typeof message === 'string'
      ? { text: message }
      : message;
    const channelId = options.channel_id ?? this.channel_id;

    if (!channelId) {
      return Promise.reject(
        new Error('A channel_id is required to send a reply to this message.')
      );
    }

    return this.sender('/!api/post/add', {
      channel_id: channelId,
      text: options.text
    });
  }
}
