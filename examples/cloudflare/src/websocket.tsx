import { Context } from "hono";
import { ObservableWebSocketBridge } from "svg-marbles-websocket";
import { interval, merge, of, throwError } from "rxjs";
import { map, take, delay, concatMap, scan } from "rxjs/operators";

// Create a singleton bridge instance
const bridge = new ObservableWebSocketBridge();

// Register example Observable streams
function registerExampleStreams() {
  // 1. Simple interval stream
  bridge.registerStream({
    streamId: "interval-1s",
    name: "Interval (1s)",
    description: "Emits incrementing numbers every second",
    observable: interval(1000).pipe(take(60))
  });

  // 2. Random values stream
  bridge.registerStream({
    streamId: "random",
    name: "Random Numbers",
    description: "Emits random numbers between 0-100",
    observable: interval(800).pipe(
      map(() => Math.floor(Math.random() * 100)),
      take(100)
    )
  });

  // 3. Merged streams
  const stream1 = interval(1000).pipe(
    map((i) => `A${i}`),
    take(20)
  );
  const stream2 = interval(1500).pipe(
    map((i) => `B${i}`),
    take(20)
  );
  bridge.registerStream({
    streamId: "merged",
    name: "Merged Streams",
    description: "Two streams merged together",
    observable: merge(stream1, stream2)
  });

  // 4. Error example
  bridge.registerStream({
    streamId: "error-demo",
    name: "Error Demo",
    description: "Emits values then errors",
    observable: interval(1000).pipe(
      take(5),
      concatMap((i) =>
        i === 3 ? throwError(() => new Error("Demo error")) : of(i)
      )
    )
  });

  // 5. Fibonacci sequence
  bridge.registerStream({
    streamId: "fibonacci",
    name: "Fibonacci",
    description: "Fibonacci sequence",
    observable: interval(1000).pipe(
      scan(([a, b]) => [b, a + b], [0, 1]),
      map(([a]) => a),
      take(20)
    )
  });

  // 6. Accelerating emissions
  bridge.registerStream({
    streamId: "accelerating",
    name: "Accelerating",
    description: "Emissions get faster over time",
    observable: of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9).pipe(
      concatMap((i) => of(i).pipe(delay(1000 - i * 100)))
    )
  });
}

// Initialize streams on first import
registerExampleStreams();

// WebSocket handler for Cloudflare Workers
export const onWebSocketUpgrade = (c: Context) => {
  const upgradeHeader = c.req.header("upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return c.text("Expected websocket", 400);
  }

  const webSocketPair = new (WebSocketPair as any)();
  const [client, server] = Object.values(webSocketPair) as [
    WebSocket,
    WebSocket
  ];

  // Accept the WebSocket connection
  server.accept();

  // Handle the server-side WebSocket
  server.addEventListener("message", async (event: MessageEvent) => {
    console.log("Received message:", event.data);

    try {
      const message = JSON.parse(event.data);

      bridge.handleMessage(
        {
          send: (data: string) => {
            if (server.readyState === 1) {
              // OPEN
              server.send(data);
            }
          },
          close: () => server.close(),
          readyState: server.readyState
        },
        event.data
      );
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  server.addEventListener("open", () => {
    console.log("WebSocket connection opened");

    bridge.handleConnection({
      send: (data: string) => {
        if (server.readyState === 1) {
          // OPEN
          server.send(data);
        }
      },
      close: () => server.close(),
      readyState: server.readyState
    });
  });

  server.addEventListener("close", () => {
    console.log("WebSocket connection closed");

    bridge.handleDisconnection({
      send: (data: string) => {
        if (server.readyState === 1) {
          // OPEN
          server.send(data);
        }
      },
      close: () => server.close(),
      readyState: server.readyState
    });
  });

  server.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
  });

  return new Response(null, {
    status: 101,
    webSocket: client
  });
};

// Home page component
export const onRequestGet = (c: Context) =>
  c.render(
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">WS Marbles Demo</h1>

      <div className="mb-8 p-6 bg-blue-900/20 border border-blue-600 rounded-lg">
        <h2 className="text-xl font-bold text-blue-400 mb-2">
          Realtime Observable Visualization
        </h2>
        <p className="text-blue-200">
          This demo shows realtime RxJS Observable visualization using
          WebSockets. The server streams Observable events to connected clients
          in real-time.
        </p>
      </div>

      <div className="mb-8 p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Connection</h2>
        <div className="flex items-center gap-4 mb-4">
          <div id="status" className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full bg-gray-500"
              id="statusIndicator"
            ></span>
            <span id="statusText">Disconnected</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            id="connectBtn"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
            onclick="connect()"
          >
            Connect
          </button>
          <button
            id="disconnectBtn"
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            onclick="disconnect()"
            disabled
          >
            Disconnect
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            onclick="clearCanvas()"
          >
            Clear Canvas
          </button>
        </div>
      </div>

      <div className="mb-8 p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Available Streams</h2>
        <div
          id="streamsList"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <p className="text-gray-400 col-span-full">
            Connect to see available streams...
          </p>
        </div>
      </div>

      <div className="p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Live Visualization</h2>
        <canvas
          id="marbleCanvas"
          className="w-full h-96 bg-gray-900 rounded"
        ></canvas>
      </div>

      <script src="/svg-marbles-websocket-client.js"></script>
      <script src="/websocket-app.js"></script>
    </div>
  );

// API endpoint to get stream info
export const onStreamsApiGet = (c: Context) => {
  const streams = Array.from(bridge.getStreams().entries()).map(
    ([streamId, config]) => ({
      streamId,
      name: config.name,
      description: config.description,
      subscriptions: bridge.getSubscriptionCount(streamId)
    })
  );

  return c.json({
    streams,
    connections: bridge.getConnectionCount()
  });
};

// Export the bridge for use in server.ts WebSocket handlers
export { bridge };
