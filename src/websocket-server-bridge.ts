import { Observable, Subscription } from 'rxjs';
import {
  WebSocketMessage,
  ClientMessage,
  NextMessage,
  ErrorMessage,
  CompleteMessage,
  StreamInfoMessage,
  StreamsListMessage,
  isClientMessage
} from './websocket-protocol';

export interface StreamConfig {
  streamId: string;
  name: string;
  description?: string;
  observable: Observable<any>;
}

export interface WebSocketConnection {
  send(data: string): void;
  close(): void;
  readyState: number;
}

export class ObservableWebSocketBridge {
  private streams: Map<string, StreamConfig> = new Map();
  private subscriptions: Map<string, Map<WebSocketConnection, Subscription>> = new Map();
  private connections: Set<WebSocketConnection> = new Set();

  constructor() {}

  /**
   * Register an observable stream that clients can subscribe to
   */
  public registerStream(config: StreamConfig): void {
    this.streams.set(config.streamId, config);
    this.subscriptions.set(config.streamId, new Map());
    
    // Notify all connected clients about the new stream
    this.broadcastStreamsList();
  }

  /**
   * Unregister a stream and clean up all subscriptions
   */
  public unregisterStream(streamId: string): void {
    const streamSubs = this.subscriptions.get(streamId);
    if (streamSubs) {
      // Unsubscribe all clients from this stream
      streamSubs.forEach(sub => sub.unsubscribe());
      this.subscriptions.delete(streamId);
    }
    
    this.streams.delete(streamId);
    this.broadcastStreamsList();
  }

  /**
   * Handle a new WebSocket connection
   */
  public handleConnection(ws: WebSocketConnection): void {
    this.connections.add(ws);
    
    // Send initial streams list
    this.sendStreamsList(ws);
  }

  /**
   * Handle a WebSocket disconnection
   */
  public handleDisconnection(ws: WebSocketConnection): void {
    this.connections.delete(ws);
    
    // Clean up all subscriptions for this connection
    this.subscriptions.forEach((streamSubs, streamId) => {
      const sub = streamSubs.get(ws);
      if (sub) {
        sub.unsubscribe();
        streamSubs.delete(ws);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  public handleMessage(ws: WebSocketConnection, message: string): void {
    try {
      const parsed: WebSocketMessage = JSON.parse(message);
      
      if (!isClientMessage(parsed)) {
        console.warn('Received non-client message:', parsed);
        return;
      }

      this.handleClientMessage(ws, parsed);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClientMessage(ws: WebSocketConnection, message: ClientMessage): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(ws, message.streamId);
        break;
        
      case 'unsubscribe':
        this.handleUnsubscribe(ws, message.streamId);
        break;
    }
  }

  private handleSubscribe(ws: WebSocketConnection, streamId: string): void {
    const streamConfig = this.streams.get(streamId);
    if (!streamConfig) {
      console.warn(`Stream ${streamId} not found`);
      return;
    }

    const streamSubs = this.subscriptions.get(streamId);
    if (!streamSubs) {
      console.warn(`No subscription map for stream ${streamId}`);
      return;
    }

    // Check if already subscribed
    if (streamSubs.has(ws)) {
      console.warn(`WebSocket already subscribed to stream ${streamId}`);
      return;
    }

    // Send stream info
    const infoMessage: StreamInfoMessage = {
      type: 'stream-info',
      streamId,
      name: streamConfig.name,
      description: streamConfig.description,
      timestamp: Date.now()
    };
    this.sendMessage(ws, infoMessage);

    // Subscribe to the observable
    const subscription = streamConfig.observable.subscribe({
      next: (value) => {
        const message: NextMessage = {
          type: 'next',
          streamId,
          value,
          timestamp: Date.now()
        };
        this.sendMessage(ws, message);
      },
      error: (error) => {
        const message: ErrorMessage = {
          type: 'error',
          streamId,
          error: error.toString(),
          timestamp: Date.now()
        };
        this.sendMessage(ws, message);
        
        // Clean up subscription
        streamSubs.delete(ws);
      },
      complete: () => {
        const message: CompleteMessage = {
          type: 'complete',
          streamId,
          timestamp: Date.now()
        };
        this.sendMessage(ws, message);
        
        // Clean up subscription
        streamSubs.delete(ws);
      }
    });

    streamSubs.set(ws, subscription);
  }

  private handleUnsubscribe(ws: WebSocketConnection, streamId: string): void {
    const streamSubs = this.subscriptions.get(streamId);
    if (!streamSubs) {
      return;
    }

    const sub = streamSubs.get(ws);
    if (sub) {
      sub.unsubscribe();
      streamSubs.delete(ws);
    }
  }

  private sendMessage(ws: WebSocketConnection, message: WebSocketMessage): void {
    if (ws.readyState === 1) { // OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  private sendStreamsList(ws: WebSocketConnection): void {
    const streams = Array.from(this.streams.entries()).map(([streamId, config]) => ({
      streamId,
      name: config.name,
      description: config.description,
      active: true
    }));

    const message: StreamsListMessage = {
      type: 'streams-list',
      timestamp: Date.now(),
      streams
    };

    this.sendMessage(ws, message);
  }

  private broadcastStreamsList(): void {
    this.connections.forEach(ws => {
      this.sendStreamsList(ws);
    });
  }

  /**
   * Get current stream configurations
   */
  public getStreams(): Map<string, StreamConfig> {
    return new Map(this.streams);
  }

  /**
   * Get active subscriptions count for a stream
   */
  public getSubscriptionCount(streamId: string): number {
    const streamSubs = this.subscriptions.get(streamId);
    return streamSubs ? streamSubs.size : 0;
  }

  /**
   * Get total connection count
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }
}