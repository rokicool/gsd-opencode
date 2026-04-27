/**
 * CLI Transport — renders GSD events as rich ANSI-colored output to a Writable stream.
 *
 * Implements TransportHandler with colored banners, step indicators, spawn markers,
 * and running cost totals. No external dependencies — ANSI codes are inline constants.
 */
import type { Writable } from 'node:stream';
import { type GSDEvent, type TransportHandler } from './types.js';
export declare class CLITransport implements TransportHandler {
    private readonly out;
    private runningCostUsd;
    constructor(out?: Writable);
    /** Format and write a GSD event as a rich ANSI-colored line. Never throws. */
    onEvent(event: GSDEvent): void;
    /** No-op — stdout doesn't need cleanup. */
    close(): void;
    private formatEvent;
}
//# sourceMappingURL=cli-transport.d.ts.map