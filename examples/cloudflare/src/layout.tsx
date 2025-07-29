import { jsxRenderer } from "hono/jsx-renderer";

export default jsxRenderer(({ children }) => (
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>WS Marbles Demo</title>
      <link rel="stylesheet" href="/output.css" />
    </head>
    <body className="bg-gray-900 text-white">{children}</body>
  </html>
));
