import { defineConfig } from 'tsup';

export default defineConfig([
  // Server-side build (Node.js)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    treeshake: true,
    splitting: false,
    outDir: 'dist',
    platform: 'node',
  },
  // Client-side build (Browser)
  {
    entry: ['src/client.ts'],
    format: ['esm', 'iife'],
    dts: true,
    clean: false,
    sourcemap: true,
    minify: true,
    treeshake: true,
    splitting: false,
    platform: 'browser',
    globalName: 'SvgMarblesWebSocket',
    outExtension({ format }) {
      if (format === 'iife') return { js: '.global.js' };
      return { js: '.mjs' };
    },
  },
]);