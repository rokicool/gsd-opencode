/**
 * WebSocket Transport — broadcasts GSD events as JSON over WebSocket.
 *
 * Implements TransportHandler. Starts a WebSocketServer on a given port
 * and JSON-serializes each event to all connected clients.
 */
import type { GSDEvent, TransportHandler } from './types.js';
export interface WSTransportOptions {
    port: number;
}
export declare class WSTransport implements TransportHandler {
    private readonly port;
    private server;
    private closing;
    constructor(options: WSTransportOptions);
    /**
     * Start the WebSocket server on the configured port.
     * Resolves once the server is listening.
     */
    start(): Promise<void>;
    /**
     * Broadcast a GSD event as JSON to all connected clients.
     * Never throws — wraps each client.send in try/catch.
     */
    onEvent(event: GSDEvent): void;
    /**
     * Close all client connections and shut down the server.
     * Safe to call before start() — sets a closing flag.
     */
    close(): void;
}
//# sourceMappingURL=ws-transport.d.ts.map