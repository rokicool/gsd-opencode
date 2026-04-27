/**
 * GSD Event Stream — maps SDKMessage variants to typed GSD events.
 *
 * Extends EventEmitter to provide a typed event bus. Includes:
 * - SDKMessage → GSDEvent mapping
 * - Transport management (subscribe/unsubscribe handlers)
 * - Per-session cost tracking with cumulative totals
 */
import { EventEmitter } from 'node:events';
import { GSDEventType, } from './types.js';
// ─── GSDEventStream ──────────────────────────────────────────────────────────
export class GSDEventStream extends EventEmitter {
    transports = new Set();
    costTracker = {
        sessions: new Map(),
        cumulativeCostUsd: 0,
    };
    constructor() {
        super();
        this.setMaxListeners(20);
    }
    // ─── Transport management ────────────────────────────────────────────
    /** Subscribe a transport handler to receive all events. */
    addTransport(handler) {
        this.transports.add(handler);
    }
    /** Unsubscribe a transport handler. */
    removeTransport(handler) {
        this.transports.delete(handler);
    }
    /** Close all transports. */
    closeAll() {
        for (const transport of this.transports) {
            try {
                transport.close();
            }
            catch {
                // Ignore transport close errors
            }
        }
        this.transports.clear();
    }
    // ─── Event emission ──────────────────────────────────────────────────
    /** Emit a typed GSD event to all listeners and transports. */
    emitEvent(event) {
        // Emit via EventEmitter for listener-based consumers
        this.emit('event', event);
        this.emit(event.type, event);
        // Deliver to all transports — wrap in try/catch to prevent
        // one bad transport from killing the stream
        for (const transport of this.transports) {
            try {
                transport.onEvent(event);
            }
            catch {
                // Silently ignore transport errors
            }
        }
    }
    // ─── SDKMessage mapping ──────────────────────────────────────────────
    /**
     * Map an SDKMessage to a GSDEvent.
     * Returns null for non-actionable message types (user messages, replays, etc.).
     */
    mapSDKMessage(msg, context = {}) {
        const base = {
            timestamp: new Date().toISOString(),
            sessionId: 'session_id' in msg ? msg.session_id : '',
            phase: context.phase,
            planName: context.planName,
        };
        switch (msg.type) {
            case 'system':
                return this.mapSystemMessage(msg, base);
            case 'assistant':
                return this.mapAssistantMessage(msg, base);
            case 'result':
                return this.mapResultMessage(msg, base);
            case 'tool_progress':
                return this.mapToolProgressMessage(msg, base);
            case 'tool_use_summary':
                return this.mapToolUseSummaryMessage(msg, base);
            case 'rate_limit_event':
                return this.mapRateLimitMessage(msg, base);
            case 'stream_event':
                return this.mapStreamEvent(msg, base);
            // Non-actionable message types — ignore
            case 'user':
            case 'auth_status':
            case 'prompt_suggestion':
                return null;
            default:
                return null;
        }
    }
    /**
     * Map an SDKMessage and emit the resulting event (if any).
     * Convenience method combining mapSDKMessage + emitEvent.
     */
    mapAndEmit(msg, context = {}) {
        const event = this.mapSDKMessage(msg, context);
        if (event) {
            this.emitEvent(event);
        }
        return event;
    }
    // ─── Cost tracking ───────────────────────────────────────────────────
    /** Get current cost totals. */
    getCost() {
        const activeId = this.costTracker.activeSessionId;
        const sessionCost = activeId
            ? (this.costTracker.sessions.get(activeId)?.costUsd ?? 0)
            : 0;
        return {
            session: sessionCost,
            cumulative: this.costTracker.cumulativeCostUsd,
        };
    }
    /** Update cost for a session. */
    updateCost(sessionId, costUsd) {
        const existing = this.costTracker.sessions.get(sessionId);
        const previousCost = existing?.costUsd ?? 0;
        const delta = costUsd - previousCost;
        const bucket = { sessionId, costUsd };
        this.costTracker.sessions.set(sessionId, bucket);
        this.costTracker.activeSessionId = sessionId;
        this.costTracker.cumulativeCostUsd += delta;
    }
    // ─── Private mappers ─────────────────────────────────────────────────
    mapSystemMessage(msg, base) {
        // All system messages have a subtype
        const subtype = msg.subtype;
        switch (subtype) {
            case 'init': {
                const initMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.SessionInit,
                    model: initMsg.model,
                    tools: initMsg.tools,
                    cwd: initMsg.cwd,
                };
            }
            case 'api_retry': {
                const retryMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.APIRetry,
                    attempt: retryMsg.attempt,
                    maxRetries: retryMsg.max_retries,
                    retryDelayMs: retryMsg.retry_delay_ms,
                    errorStatus: retryMsg.error_status,
                };
            }
            case 'status': {
                const statusMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.StatusChange,
                    status: statusMsg.status,
                };
            }
            case 'compact_boundary': {
                const compactMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.CompactBoundary,
                    trigger: compactMsg.compact_metadata.trigger,
                    preTokens: compactMsg.compact_metadata.pre_tokens,
                };
            }
            case 'task_started': {
                const taskMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.TaskStarted,
                    taskId: taskMsg.task_id,
                    description: taskMsg.description,
                    taskType: taskMsg.task_type,
                };
            }
            case 'task_progress': {
                const progressMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.TaskProgress,
                    taskId: progressMsg.task_id,
                    description: progressMsg.description,
                    totalTokens: progressMsg.usage.total_tokens,
                    toolUses: progressMsg.usage.tool_uses,
                    durationMs: progressMsg.usage.duration_ms,
                    lastToolName: progressMsg.last_tool_name,
                };
            }
            case 'task_notification': {
                const notifMsg = msg;
                return {
                    ...base,
                    type: GSDEventType.TaskNotification,
                    taskId: notifMsg.task_id,
                    status: notifMsg.status,
                    summary: notifMsg.summary,
                };
            }
            // Non-actionable system subtypes
            case 'hook_started':
            case 'hook_progress':
            case 'hook_response':
            case 'local_command_output':
            case 'session_state_changed':
            case 'files_persisted':
            case 'elicitation_complete':
                return null;
            default:
                return null;
        }
    }
    mapAssistantMessage(msg, base) {
        const events = [];
        // Extract text blocks — content blocks are a discriminated union with a 'type' field.
        // Double-cast via unknown because BetaContentBlock's internal variants don't
        // carry an index signature, so TS rejects the direct cast without a widening step.
        const content = msg.message.content;
        const textBlocks = content.filter((b) => b.type === 'text');
        if (textBlocks.length > 0) {
            const text = textBlocks.map(b => b.text).join('');
            if (text.length > 0) {
                events.push({
                    ...base,
                    type: GSDEventType.AssistantText,
                    text,
                });
            }
        }
        // Extract tool_use blocks
        const toolUseBlocks = content.filter((b) => b.type === 'tool_use');
        for (const block of toolUseBlocks) {
            events.push({
                ...base,
                type: GSDEventType.ToolCall,
                toolName: block.name,
                toolUseId: block.id,
                input: block.input,
            });
        }
        // Return the first event — for multi-event messages, emit the rest
        // via separate emitEvent calls. This preserves the single-return contract
        // while still handling multi-block messages.
        if (events.length === 0)
            return null;
        if (events.length === 1)
            return events[0];
        // For multi-event assistant messages, emit all but the last directly,
        // and return the last one for the caller to handle
        for (let i = 0; i < events.length - 1; i++) {
            this.emitEvent(events[i]);
        }
        return events[events.length - 1];
    }
    mapResultMessage(msg, base) {
        // Update cost tracking
        this.updateCost(msg.session_id, msg.total_cost_usd);
        if (msg.subtype === 'success') {
            const successMsg = msg;
            return {
                ...base,
                type: GSDEventType.SessionComplete,
                success: true,
                totalCostUsd: successMsg.total_cost_usd,
                durationMs: successMsg.duration_ms,
                numTurns: successMsg.num_turns,
                result: successMsg.result,
            };
        }
        const errorMsg = msg;
        return {
            ...base,
            type: GSDEventType.SessionError,
            success: false,
            totalCostUsd: errorMsg.total_cost_usd,
            durationMs: errorMsg.duration_ms,
            numTurns: errorMsg.num_turns,
            errorSubtype: errorMsg.subtype,
            errors: errorMsg.errors,
        };
    }
    mapToolProgressMessage(msg, base) {
        return {
            ...base,
            type: GSDEventType.ToolProgress,
            toolName: msg.tool_name,
            toolUseId: msg.tool_use_id,
            elapsedSeconds: msg.elapsed_time_seconds,
        };
    }
    mapToolUseSummaryMessage(msg, base) {
        return {
            ...base,
            type: GSDEventType.ToolUseSummary,
            summary: msg.summary,
            toolUseIds: msg.preceding_tool_use_ids,
        };
    }
    mapRateLimitMessage(msg, base) {
        return {
            ...base,
            type: GSDEventType.RateLimit,
            status: msg.rate_limit_info.status,
            resetsAt: msg.rate_limit_info.resetsAt,
            utilization: msg.rate_limit_info.utilization,
        };
    }
    mapStreamEvent(msg, base) {
        return {
            ...base,
            type: GSDEventType.StreamEvent,
            event: msg.event,
        };
    }
}
//# sourceMappingURL=event-stream.js.map