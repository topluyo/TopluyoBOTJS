import {
  TopluyoClient as Client,
  type TopluyoClientOptions
} from './client/TopluyoClient.js';
import { EventDispatcher as Dispatcher } from './gateway/EventDispatcher.js';
import { WebSocketManager as Gateway } from './gateway/WebSocketManager.js';
import { RESTManager as REST } from './rest/RESTManager.js';
import {
  FormInteraction as FormInteractionStructure
} from './structure/FormInteraction.js';
import { Message as MessageStructure } from './structure/Message.js';
import { User as UserStructure } from './structure/User.js';

function TopluyoBOT(token: string, options?: TopluyoClientOptions): Client {
  return new Client(token, options);
}

namespace TopluyoBOT {
  export const TopluyoClient = Client;
  export const EventDispatcher = Dispatcher;
  export const WebSocketManager = Gateway;
  export const RESTManager = REST;
  export const Message = MessageStructure;
  export const User = UserStructure;
  export const FormInteraction = FormInteractionStructure;
  export type Message = MessageStructure;
  export type User = UserStructure;
  export type FormInteraction = FormInteractionStructure;
  export type BotInstance = Client;
  export type TopluyoClientOptions = import('./client/TopluyoClient.js').TopluyoClientOptions;
  export type RESTRequest = import('./rest/types.js').RESTRequest;
  export type RESTResponse = import('./rest/types.js').RESTResponse;
}

export = TopluyoBOT;
