/**
 * GSD Event Stream — maps SDKMessage variants to typed GSD events.
 *
 * Extends EventEmitter to provide a typed event bus. Includes:
 * - SDKMessage → GSDEvent mapping
 * - Transport management (subscribe/unsubscribe handlers)
 * - Per-session cost tracking with cumulative totals
 */
import { EventEmitter } from 'node:events';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { type GSDEvent, type TransportHandler, type PhaseType } from './types.js';
export interface EventStreamContext {
    phase?: PhaseType;
    planName?: string;
}
export declare class GSDEventStream extends EventEmitter {
    private readonly transports;
    private readonly costTracker;
    constructor();
    /** Subscribe a transport handler to receive all events. */
    addTransport(handler: TransportHandler): void;
    /** Unsubscribe a transport handler. */
    removeTransport(handler: TransportHandler): void;
    /** Close all transports. */
    closeAll(): void;
    /** Emit a typed GSD event to all listeners and transports. */
    emitEvent(event: GSDEvent): void;
    /**
     * Map an SDKMessage to a GSDEvent.
     * Returns null for non-actionable message types (user messages, replays, etc.).
     */
    mapSDKMessage(msg: SDKMessage, context?: EventStreamContext): GSDEvent | null;
    /**
     * Map an SDKMessage and emit the resulting event (if any).
     * Convenience method combining mapSDKMessage + emitEvent.
     */
    mapAndEmit(msg: SDKMessage, context?: EventStreamContext): GSDEvent | null;
    /** Get current cost totals. */
    getCost(): {
        session: number;
        cumulative: number;
    };
    /** Update cost for a session. */
    private updateCost;
    private mapSystemMessage;
    private mapAssistantMessage;
    private mapResultMessage;
    private mapToolProgressMessage;
    private mapToolUseSummaryMessage;
    private mapRateLimitMessage;
    private mapStreamEvent;
}
//# sourceMappingURL=event-stream.d.ts.map