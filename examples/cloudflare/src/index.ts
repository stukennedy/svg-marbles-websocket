import { Hono } from "hono";
import { onRequestGet, onWebSocketUpgrade, onStreamsApiGet } from "./websocket";
import RootLayout from "./layout";

const app = new Hono();

app.use("*", RootLayout);
app.get("/", onRequestGet);
app.get("/ws", onWebSocketUpgrade);
app.get("/api/streams", onStreamsApiGet);

export default app;
