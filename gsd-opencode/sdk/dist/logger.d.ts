/**
 * Structured JSON logger for GSD debugging.
 *
 * Writes structured log entries to stderr (or configurable writable stream).
 * This is a debugging facility (R019), separate from the event stream.
 */
import type { Writable } from 'node:stream';
import type { PhaseType } from './types.js';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    phase?: PhaseType;
    plan?: string;
    sessionId?: string;
    message: string;
    data?: Record<string, unknown>;
}
export interface GSDLoggerOptions {
    /** Minimum log level to output. Default: 'info'. */
    level?: LogLevel;
    /** Output stream. Default: process.stderr. */
    output?: Writable;
    /** Phase context for all log entries. */
    phase?: PhaseType;
    /** Plan name context for all log entries. */
    plan?: string;
    /** Session ID context for all log entries. */
    sessionId?: string;
}
export declare class GSDLogger {
    private readonly minLevel;
    private readonly output;
    private phase?;
    private plan?;
    private sessionId?;
    constructor(options?: GSDLoggerOptions);
    /** Set phase context for subsequent log entries. */
    setPhase(phase: PhaseType | undefined): void;
    /** Set plan context for subsequent log entries. */
    setPlan(plan: string | undefined): void;
    /** Set session ID context for subsequent log entries. */
    setSessionId(sessionId: string | undefined): void;
    debug(message: string, data?: Record<string, unknown>): void;
    info(message: string, data?: Record<string, unknown>): void;
    warn(message: string, data?: Record<string, unknown>): void;
    error(message: string, data?: Record<string, unknown>): void;
    private log;
}
//# sourceMappingURL=logger.d.ts.map