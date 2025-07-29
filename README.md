# 🎯 ws-marbles

[![npm version](https://img.shields.io/npm/v/ws-marbles.svg)](https://www.npmjs.com/package/ws-marbles)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-v7-purple.svg)](https://rxjs.dev/)

> Realtime WebSocket visualization for RxJS Observables. Stream Observable events from server to browser with live marble diagram rendering.

<p align="center">
  <img src="screenshot.gif" alt="ws-marbles demo" width="100%"/>
</p>

<p align="center">
  <em>Live marble diagram visualization of multiple RxJS Observable streams</em>
</p>

## ✨ Features

- 🚀 **Realtime Streaming** - Stream any RxJS Observable over WebSockets with automatic reconnection
- 🎨 **Canvas Rendering** - Smooth, performant marble diagrams with customizable themes
- 📊 **Multiple Streams** - Visualize multiple Observable streams simultaneously
- 🎯 **Simple API** - Easy client/server setup with minimal configuration
- 📦 **Lightweight** - Minimal dependencies, tree-shakeable builds
- 🔄 **Auto-reconnection** - Resilient WebSocket connections with configurable retry
- 🎨 **Per-Stream Themes** - Customize colors and styles for individual streams
- 📱 **Responsive** - Automatically adapts to container size

## 📦 Installation

```bash
npm install ws-marbles
# or
yarn add ws-marbles
# or
pnpm add ws-marbles
# or
bun add ws-marbles
```

## 🚀 Quick Start

### Server Setup (Node.js/Bun)

```typescript
import { ObservableWebSocketBridge } from "ws-marbles";
import { interval, merge } from "rxjs";
import { map, take } from "rxjs/operators";

// Create bridge instance
const bridge = new ObservableWebSocketBridge();

// Register Observable streams
bridge.registerStream({
  streamId: "counter",
  name: "Counter Stream",
  description: "Emits incrementing numbers every second",
  observable: interval(1000).pipe(take(30)),
  theme: {
    valueColor: "#4CAF50",
    errorColor: "#f44336",
    completeColor: "#2196F3"
  }
});

bridge.registerStream({
  streamId: "random",
  name: "Random Numbers",
  description: "Random values between 0-100",
  observable: interval(800).pipe(
    map(() => Math.floor(Math.random() * 100))
  )
});

// WebSocket server setup (Bun example)
Bun.serve({
  port: 3000,
  websocket: {
    open(ws) {
      bridge.handleConnection({
        send: (data) => ws.send(data),
        close: () => ws.close(),
        readyState: ws.readyState
      });
    },
    message(ws, message) {
      bridge.handleMessage(
        {
          send: (data) => ws.send(data),
          close: () => ws.close(),
          readyState: ws.readyState
        },
        message.toString()
      );
    },
    close(ws) {
      bridge.handleDisconnection({
        send: (data) => ws.send(data),
        close: () => ws.close(),
        readyState: ws.readyState
      });
    }
  }
});
```

### Client Setup (Browser)

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    #marble-canvas {
      width: 100%;
      height: 400px;
      background: #1a1a1a;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <canvas id="marble-canvas"></canvas>
  
  <!-- Option 1: CDN -->
  <script src="https://unpkg.com/ws-marbles/dist/client.global.js"></script>
  
  <script>
    const { WebSocketMarbleRenderer } = WsMarbles;
    
    const canvas = document.getElementById("marble-canvas");
    const renderer = new WebSocketMarbleRenderer(canvas, {
      url: "ws://localhost:3000",
      theme: {
        backgroundColor: "#1a1a1a",
        timelineColor: "#666",
        valueColor: "#4CAF50",
        errorColor: "#f44336",
        completeColor: "#2196F3"
      },
      scrollSpeed: 60,
      maxDuration: 30000
    });
    
    // Connect and subscribe to streams
    renderer.connect();
    renderer.subscribe("counter");
    renderer.subscribe("random");
  </script>
</body>
</html>
```

### ES Modules / TypeScript

```typescript
import { WebSocketMarbleRenderer } from "ws-marbles/client";

const canvas = document.querySelector<HTMLCanvasElement>("#marbles");
const renderer = new WebSocketMarbleRenderer(canvas, {
  url: "ws://localhost:3000",
  scrollSpeed: 50,
  maxDuration: 40000,
  reconnectDelay: 3000
});

renderer.connect();
```

## 📚 API Reference

### Server API

#### `ObservableWebSocketBridge`

Manages Observable streams and WebSocket connections.

```typescript
const bridge = new ObservableWebSocketBridge();
```

##### Methods

| Method | Description |
|--------|-------------|
| `registerStream(config: StreamConfig)` | Register an Observable stream |
| `unregisterStream(streamId: string)` | Remove a registered stream |
| `handleConnection(ws: WebSocketConnection)` | Handle new WebSocket connection |
| `handleMessage(ws: WebSocketConnection, message: string)` | Process incoming messages |
| `handleDisconnection(ws: WebSocketConnection)` | Clean up disconnected client |

##### StreamConfig

```typescript
interface StreamConfig {
  streamId: string;           // Unique identifier
  name: string;               // Display name
  description?: string;       // Stream description
  observable: Observable<any>; // RxJS Observable to stream
  theme?: Partial<SVGTheme>;  // Optional custom theme
}
```

### Client API

#### `WebSocketMarbleRenderer`

Renders Observable events on a canvas element.

```typescript
const renderer = new WebSocketMarbleRenderer(canvas, options);
```

##### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | required | WebSocket server URL |
| `theme` | `Partial<SVGTheme>` | default theme | Visual customization |
| `scrollSpeed` | `number` | `50` | Pixels per second scroll rate |
| `maxDuration` | `number` | `30000` | Time window in milliseconds |
| `reconnectDelay` | `number` | `3000` | Auto-reconnect delay (ms) |
| `values` | `Record<string, any>` | `undefined` | Custom value display mapping |

##### Methods

| Method | Description |
|--------|-------------|
| `connect()` | Connect to WebSocket server |
| `disconnect()` | Close connection |
| `subscribe(streamId: string)` | Subscribe to a stream |
| `unsubscribe(streamId: string)` | Unsubscribe from a stream |
| `clear()` | Clear the canvas |
| `updateOptions(options)` | Update renderer configuration |

##### Theme Options

```typescript
interface SVGTheme {
  backgroundColor: string;    // Canvas background
  timelineColor: string;      // Timeline/axis color
  valueColor: string;         // Default marble color
  errorColor: string;         // Error marble color
  completeColor: string;      // Completion marker color
  fontSize: number;           // Text size in pixels
  fontFamily: string;         // Font family
  marbleRadius: number;       // Marble size
  strokeWidth: number;        // Line thickness
}
```

## 🎨 Advanced Usage

### Custom Value Display

Map complex values to simple display strings:

```typescript
const renderer = new WebSocketMarbleRenderer(canvas, {
  url: "ws://localhost:3000",
  values: {
    "user:1": "Alice",
    "user:2": "Bob",
    "status:active": "✓",
    "status:inactive": "✗"
  }
});
```

### Per-Stream Themes

Customize individual stream appearance:

```typescript
bridge.registerStream({
  streamId: "errors",
  name: "Error Stream",
  observable: errorStream$,
  theme: {
    valueColor: "#ff6b6b",
    marbleRadius: 12
  }
});
```

### Framework Integration

#### React Example

```tsx
import { useEffect, useRef } from 'react';
import { WebSocketMarbleRenderer } from 'ws-marbles/client';

export function MarbleVisualization({ streamId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebSocketMarbleRenderer>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new WebSocketMarbleRenderer(canvasRef.current, {
      url: 'ws://localhost:3000',
      scrollSpeed: 60
    });

    renderer.connect();
    renderer.subscribe(streamId);
    rendererRef.current = renderer;

    return () => {
      renderer.disconnect();
    };
  }, [streamId]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: 400 }} />;
}
```

## 🛠️ Examples

### Complete Demo Application

Check out the `examples/cloudflare` directory for a full-featured demo including:

- ⚡ Cloudflare Workers WebSocket server
- 🎨 Tailwind CSS styled UI
- 📊 Multiple stream types
- 🔄 Stream management interface

To run the example:

```bash
cd examples/cloudflare
npm install
npm run dev
```

Visit `http://localhost:8787/realtime` to see the demo.

### Simple Bun Server

```typescript
// server.ts
import { ObservableWebSocketBridge } from "ws-marbles";
import { interval, timer, throwError } from "rxjs";
import { map, mergeWith, take } from "rxjs/operators";

const bridge = new ObservableWebSocketBridge();

// Example streams
bridge.registerStream({
  streamId: "fibonacci",
  name: "Fibonacci Sequence",
  observable: interval(1000).pipe(
    map(i => {
      const fib = (n: number): number => 
        n <= 1 ? n : fib(n - 1) + fib(n - 2);
      return fib(i);
    }),
    take(10)
  )
});

bridge.registerStream({
  streamId: "mixed",
  name: "Success and Errors",
  observable: interval(1000).pipe(
    map(i => i * 10),
    mergeWith(
      timer(5000).pipe(
        mergeWith(throwError(() => new Error("Oops!")))
      )
    )
  )
});

console.log("WebSocket server running on ws://localhost:3000");
```

## 🏗️ Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ws-marbles.git
cd ws-marbles

# Install dependencies
bun install

# Build the library
bun run build

# Watch mode
bun run dev
```

### Project Structure

```
ws-marbles/
├── src/
│   ├── index.ts                    # Server exports
│   ├── client.ts                   # Client exports
│   ├── websocket-server-bridge.ts  # Server bridge
│   ├── websocket-client-renderer.ts # Client renderer
│   └── websocket-protocol.ts       # Protocol types
├── examples/
│   └── cloudflare/                 # Cloudflare Workers demo
├── dist/                           # Build output
└── package.json
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [RxJS](https://rxjs.dev/) - Reactive Extensions for JavaScript
- Inspired by [RxJS Marble Diagrams](https://rxmarbles.com/)
- Canvas rendering techniques from the visualization community

---

<p align="center">
Made with ❤️ by developers for developers
</p>