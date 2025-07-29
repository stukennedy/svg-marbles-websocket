// Client-side browser exports
export { WebSocketMarbleRenderer } from './websocket-client-renderer';
export type { WebSocketRendererOptions } from './websocket-client-renderer';
export * from './websocket-protocol';

// Theme types from original svg-marbles
export interface SVGTheme {
  backgroundColor: string;
  lineColor: string;
  valueColor: string;
  errorColor: string;
  completeColor: string;
  textColor: string;
  fontSize: number;
  lineWidth: number;
  circleRadius: number;
  circleStrokeColor?: string;
  circleStrokeWidth?: number;
  padding: number;
  rowHeight: number;
  timeScale: number;
}

export const defaultTheme: SVGTheme = {
  backgroundColor: '#ffffff',
  lineColor: '#333333',
  valueColor: '#4CAF50',
  errorColor: '#f44336',
  completeColor: '#2196F3',
  textColor: '#000000',
  fontSize: 14,
  lineWidth: 2,
  circleRadius: 8,
  padding: 25,
  rowHeight: 60,
  timeScale: 3
};