// WebSocket message protocol for streaming Observable events

export type MessageType = 'subscribe' | 'unsubscribe' | 'next' | 'error' | 'complete' | 'stream-info' | 'streams-list';

export interface BaseMessage {
  type: MessageType;
  streamId: string;
  timestamp: number;
}

// Client -> Server messages
export interface SubscribeMessage extends BaseMessage {
  type: 'subscribe';
}

export interface UnsubscribeMessage extends BaseMessage {
  type: 'unsubscribe';
}

// Server -> Client messages
export interface NextMessage extends BaseMessage {
  type: 'next';
  value: any;
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  error: string;
}

export interface CompleteMessage extends BaseMessage {
  type: 'complete';
}

export interface StreamInfoMessage extends BaseMessage {
  type: 'stream-info';
  name: string;
  description?: string;
}

export interface StreamsListMessage {
  type: 'streams-list';
  timestamp: number;
  streams: Array<{
    streamId: string;
    name: string;
    description?: string;
    active: boolean;
  }>;
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage;
export type ServerMessage = NextMessage | ErrorMessage | CompleteMessage | StreamInfoMessage | StreamsListMessage;
export type WebSocketMessage = ClientMessage | ServerMessage;

// Type guards
export function isClientMessage(msg: WebSocketMessage): msg is ClientMessage {
  return msg.type === 'subscribe' || msg.type === 'unsubscribe';
}

export function isServerMessage(msg: WebSocketMessage): msg is ServerMessage {
  return !isClientMessage(msg);
}