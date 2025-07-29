import { SVGTheme, defaultTheme } from './client';
import { WebSocketMessage, ServerMessage, SubscribeMessage, UnsubscribeMessage, isServerMessage } from './websocket-protocol';

export interface WebSocketRendererOptions {
  url: string;
  theme?: Partial<SVGTheme>;
  streamThemes?: Record<string, Partial<SVGTheme>>; // Per-stream theme overrides, keyed by streamId
  scrollSpeed?: number; // pixels per second
  maxDuration?: number; // maximum time window in milliseconds
  reconnectDelay?: number; // milliseconds to wait before reconnecting
  values?: Record<string, any>; // Mapping of values to display strings
}

interface StreamEvent {
  time: number; // relative time since stream started
  value?: any;
  type: 'next' | 'error' | 'complete';
  timestamp: number; // actual timestamp
}

interface StreamState {
  streamId: string;
  name: string;
  events: StreamEvent[];
  startTime: number;
  active: boolean;
}

export class WebSocketMarbleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ws?: WebSocket;
  private theme: SVGTheme;
  private scrollSpeed: number;
  private maxDuration: number;
  private reconnectDelay: number;
  private streams: Map<string, StreamState> = new Map();
  private animationFrameId?: number;
  private url: string;
  private values?: Record<string, any>;
  private streamThemes?: Record<string, Partial<SVGTheme>>;
  private reconnectTimeoutId?: ReturnType<typeof setTimeout>;
  private isConnected: boolean = false;

  constructor(canvas: HTMLCanvasElement, options: WebSocketRendererOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = ctx;
    this.url = options.url;
    this.theme = { ...defaultTheme, ...options.theme };
    this.scrollSpeed = options.scrollSpeed ?? 50; // 50 pixels per second default
    this.maxDuration = options.maxDuration ?? 30000; // 30 seconds default window
    this.reconnectDelay = options.reconnectDelay ?? 3000; // 3 seconds default
    this.values = options.values;
    this.streamThemes = options.streamThemes;

    // Set up canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = undefined;
        }
        this.requestStreamsList();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (isServerMessage(message)) {
            this.handleServerMessage(message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
        this.scheduleReconnect();
      };

      // Start animation if not already running
      if (!this.animationFrameId) {
        this.startAnimation();
      }
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeoutId) {
      return; // Already scheduled
    }

    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = undefined;
      this.connect();
    }, this.reconnectDelay);
  }

  private requestStreamsList() {
    // Server should send streams list on connect
  }

  private handleServerMessage(message: ServerMessage) {
    switch (message.type) {
      case 'stream-info':
        if (!this.streams.has(message.streamId)) {
          this.streams.set(message.streamId, {
            streamId: message.streamId,
            name: message.name,
            events: [],
            startTime: Date.now(),
            active: true
          });
        } else {
          const stream = this.streams.get(message.streamId)!;
          stream.name = message.name;
        }
        break;

      case 'next':
        const nextStream = this.streams.get(message.streamId);
        if (nextStream) {
          const relativeTime = message.timestamp - nextStream.startTime;
          nextStream.events.push({
            time: relativeTime,
            value: message.value,
            type: 'next',
            timestamp: message.timestamp
          });
        }
        break;

      case 'error':
        const errorStream = this.streams.get(message.streamId);
        if (errorStream) {
          const relativeTime = message.timestamp - errorStream.startTime;
          errorStream.events.push({
            time: relativeTime,
            type: 'error',
            timestamp: message.timestamp
          });
          errorStream.active = false;
        }
        break;

      case 'complete':
        const completeStream = this.streams.get(message.streamId);
        if (completeStream) {
          const relativeTime = message.timestamp - completeStream.startTime;
          completeStream.events.push({
            time: relativeTime,
            type: 'complete',
            timestamp: message.timestamp
          });
          completeStream.active = false;
        }
        break;

      case 'streams-list':
        // Update active streams
        message.streams.forEach((streamInfo) => {
          if (!this.streams.has(streamInfo.streamId)) {
            this.streams.set(streamInfo.streamId, {
              streamId: streamInfo.streamId,
              name: streamInfo.name,
              events: [],
              startTime: Date.now(),
              active: streamInfo.active
            });
          }
        });
        break;
    }
  }

  public subscribe(streamId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    const message: SubscribeMessage = {
      type: 'subscribe',
      streamId,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));
  }

  public unsubscribe(streamId: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    const message: UnsubscribeMessage = {
      type: 'unsubscribe',
      streamId,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(message));

    // Mark stream as inactive
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.active = false;
    }
  }

  private startAnimation() {
    const animate = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private render() {
    const { width, height } = this.canvas;

    // Clear canvas
    this.ctx.fillStyle = this.theme.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    const currentTime = Date.now();
    const streamsArray = Array.from(this.streams.values());
    const rowHeight = height / Math.max(streamsArray.length, 1);

    // Draw each stream
    streamsArray.forEach((stream, index) => {
      const y = rowHeight * index + rowHeight / 2;
      this.renderStream(stream, y, currentTime, width, rowHeight);
    });

    // Draw connection status
    this.drawConnectionStatus();
  }

  private renderStream(stream: StreamState, y: number, currentTime: number, width: number, rowHeight: number) {
    // Get theme for this stream (merge global theme with stream-specific overrides)
    const streamTheme = this.getStreamTheme(stream.streamId);
    const { padding, lineWidth, circleRadius, fontSize } = streamTheme;

    // Draw timeline - ensure we start after potential circle overlap
    const timelineStartX = padding + circleRadius;
    const timelineEndX = width - padding - circleRadius;
    
    this.ctx.strokeStyle = streamTheme.lineColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(timelineStartX, y);
    this.ctx.lineTo(timelineEndX, y);
    this.ctx.stroke();

    // Draw stream name
    this.ctx.fillStyle = streamTheme.textColor;
    this.ctx.font = `${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(stream.name, padding, y - 20);

    // Remove old events outside the window
    const streamAge = currentTime - stream.startTime;
    stream.events = stream.events.filter((event) => streamAge - event.time < this.maxDuration);

    // Draw events
    stream.events.forEach((event) => {
      const timeSinceEvent = streamAge - event.time;
      const x = timelineEndX - (timeSinceEvent * this.scrollSpeed) / 1000;

      if (x >= timelineStartX && x <= timelineEndX) {
        this.drawEvent(event, x, y, streamTheme);
      }
    });

    // Draw status indicator
    this.drawStreamStatus(stream, width - padding - 20, y);
  }

  private drawEvent(event: StreamEvent, x: number, y: number, theme: SVGTheme) {
    const { circleRadius, lineWidth, fontSize } = theme;

    switch (event.type) {
      case 'next':
        // Draw circle
        const strokeColor = theme.circleStrokeColor || theme.lineColor;
        const strokeWidth = theme.circleStrokeWidth || lineWidth;

        this.ctx.fillStyle = theme.valueColor;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.beginPath();
        this.ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw value text
        if (event.value !== undefined) {
          const displayValue = this.values && this.values[event.value] !== undefined ? this.values[event.value] : event.value;

          this.ctx.fillStyle = theme.textColor;
          this.ctx.font = `${fontSize}px Arial, sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(String(displayValue), x, y);
        }
        break;

      case 'error':
        // Draw X
        this.ctx.strokeStyle = theme.errorColor;
        this.ctx.lineWidth = lineWidth * 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x - circleRadius, y - circleRadius);
        this.ctx.lineTo(x + circleRadius, y + circleRadius);
        this.ctx.moveTo(x - circleRadius, y + circleRadius);
        this.ctx.lineTo(x + circleRadius, y - circleRadius);
        this.ctx.stroke();
        break;

      case 'complete':
        // Draw vertical line
        this.ctx.strokeStyle = theme.completeColor;
        this.ctx.lineWidth = lineWidth * 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - circleRadius * 1.5);
        this.ctx.lineTo(x, y + circleRadius * 1.5);
        this.ctx.stroke();
        break;
    }
  }

  private drawStreamStatus(stream: StreamState, x: number, y: number) {
    const radius = 4;
    this.ctx.fillStyle = stream.active ? '#4CAF50' : '#757575';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  private drawConnectionStatus() {
    const { fontSize } = this.theme;
    const status = this.isConnected ? 'Connected' : 'Disconnected';
    const color = this.isConnected ? '#4CAF50' : '#f44336';

    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize - 2}px Arial, sans-serif`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(status, this.canvas.width - 10, 10);
  }

  private getStreamTheme(streamId: string): SVGTheme {
    // If there's a stream-specific theme, merge it with the global theme
    if (this.streamThemes && this.streamThemes[streamId]) {
      return { ...this.theme, ...this.streamThemes[streamId] };
    }
    return this.theme;
  }

  public disconnect() {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    this.isConnected = false;
  }

  public clear() {
    this.streams.clear();
    const { width, height } = this.canvas;
    this.ctx.fillStyle = this.theme.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);
  }

  public updateOptions(options: Partial<WebSocketRendererOptions>) {
    if (options.theme) {
      this.theme = { ...this.theme, ...options.theme };
    }
    if (options.scrollSpeed !== undefined) {
      this.scrollSpeed = options.scrollSpeed;
    }
    if (options.maxDuration !== undefined) {
      this.maxDuration = options.maxDuration;
    }
    if (options.values !== undefined) {
      this.values = options.values;
    }
    if (options.streamThemes !== undefined) {
      this.streamThemes = options.streamThemes;
    }
  }
}
