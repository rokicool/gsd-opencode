/**
 * Structured JSON logger for GSD debugging.
 *
 * Writes structured log entries to stderr (or configurable writable stream).
 * This is a debugging facility (R019), separate from the event stream.
 */
const LOG_LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
// ─── Logger class ────────────────────────────────────────────────────────────
export class GSDLogger {
    minLevel;
    output;
    phase;
    plan;
    sessionId;
    constructor(options = {}) {
        this.minLevel = LOG_LEVEL_PRIORITY[options.level ?? 'info'];
        this.output = options.output ?? process.stderr;
        this.phase = options.phase;
        this.plan = options.plan;
        this.sessionId = options.sessionId;
    }
    /** Set phase context for subsequent log entries. */
    setPhase(phase) {
        this.phase = phase;
    }
    /** Set plan context for subsequent log entries. */
    setPlan(plan) {
        this.plan = plan;
    }
    /** Set session ID context for subsequent log entries. */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    debug(message, data) {
        this.log('debug', message, data);
    }
    info(message, data) {
        this.log('info', message, data);
    }
    warn(message, data) {
        this.log('warn', message, data);
    }
    error(message, data) {
        this.log('error', message, data);
    }
    log(level, message, data) {
        if (LOG_LEVEL_PRIORITY[level] < this.minLevel)
            return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
        };
        if (this.phase !== undefined)
            entry.phase = this.phase;
        if (this.plan !== undefined)
            entry.plan = this.plan;
        if (this.sessionId !== undefined)
            entry.sessionId = this.sessionId;
        if (data !== undefined)
            entry.data = data;
        this.output.write(JSON.stringify(entry) + '\n');
    }
}
//# sourceMappingURL=logger.js.map