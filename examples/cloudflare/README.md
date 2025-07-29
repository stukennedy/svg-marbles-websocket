# SVG Marbles WebSocket - Cloudflare Workers Example

Realtime RxJS Observable visualization with WebSockets on Cloudflare Workers.

## Prerequisites

Before running this example, make sure to build the svg-marbles-websocket library:

```bash
# From the root directory
cd ../..
bun install
bun run build
```

## Setup

```bash
bun install
```

## Development

```bash
# Run the development server
bun dev

# In another terminal, build Tailwind CSS (optional, for style changes)
bun run tailwind
```

## Features

- **Realtime WebSocket streaming** - Live Observable events via WebSocketPair API
- **Multiple example streams** - Intervals, random numbers, errors, Fibonacci, etc.
- **Interactive UI** - Subscribe/unsubscribe to individual streams
- **Canvas visualization** - Smooth scrolling marble diagrams
- **Cloudflare Workers** - Edge deployment with WebSocket support

## Routes

- `/` - Realtime WebSocket marble visualization
- `/ws` - WebSocket endpoint (using Cloudflare Workers WebSocketPair API)
- `/api/streams` - REST API for available Observable streams