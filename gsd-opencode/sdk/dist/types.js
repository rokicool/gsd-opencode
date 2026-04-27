/**
 * Core type definitions for GSD-1 PLAN.md structures.
 *
 * These types model the YAML frontmatter + XML task bodies
 * that make up a GSD plan file.
 */
// ─── S02: Event stream types ─────────────────────────────────────────────────
/**
 * Phase types for GSD execution workflow.
 */
export var PhaseType;
(function (PhaseType) {
    PhaseType["Discuss"] = "discuss";
    PhaseType["Research"] = "research";
    PhaseType["Plan"] = "plan";
    PhaseType["Execute"] = "execute";
    PhaseType["Verify"] = "verify";
    PhaseType["Repair"] = "repair";
})(PhaseType || (PhaseType = {}));
/**
 * Event types emitted by the GSD event stream.
 * Maps from SDKMessage variants to domain-meaningful events.
 */
export var GSDEventType;
(function (GSDEventType) {
    GSDEventType["SessionInit"] = "session_init";
    GSDEventType["SessionComplete"] = "session_complete";
    GSDEventType["SessionError"] = "session_error";
    GSDEventType["AssistantText"] = "assistant_text";
    GSDEventType["ToolCall"] = "tool_call";
    GSDEventType["ToolProgress"] = "tool_progress";
    GSDEventType["ToolUseSummary"] = "tool_use_summary";
    GSDEventType["TaskStarted"] = "task_started";
    GSDEventType["TaskProgress"] = "task_progress";
    GSDEventType["TaskNotification"] = "task_notification";
    GSDEventType["CostUpdate"] = "cost_update";
    GSDEventType["APIRetry"] = "api_retry";
    GSDEventType["RateLimit"] = "rate_limit";
    GSDEventType["StatusChange"] = "status_change";
    GSDEventType["CompactBoundary"] = "compact_boundary";
    GSDEventType["StreamEvent"] = "stream_event";
    GSDEventType["PhaseStart"] = "phase_start";
    GSDEventType["PhaseStepStart"] = "phase_step_start";
    GSDEventType["PhaseStepComplete"] = "phase_step_complete";
    GSDEventType["PhaseComplete"] = "phase_complete";
    GSDEventType["WaveStart"] = "wave_start";
    GSDEventType["WaveComplete"] = "wave_complete";
    GSDEventType["MilestoneStart"] = "milestone_start";
    GSDEventType["MilestoneComplete"] = "milestone_complete";
    GSDEventType["InitStart"] = "init_start";
    GSDEventType["InitStepStart"] = "init_step_start";
    GSDEventType["InitStepComplete"] = "init_step_complete";
    GSDEventType["InitComplete"] = "init_complete";
    GSDEventType["InitResearchSpawn"] = "init_research_spawn";
    GSDEventType["StateMutation"] = "state_mutation";
    GSDEventType["ConfigMutation"] = "config_mutation";
    GSDEventType["FrontmatterMutation"] = "frontmatter_mutation";
    GSDEventType["GitCommit"] = "git_commit";
    GSDEventType["TemplateFill"] = "template_fill";
})(GSDEventType || (GSDEventType = {}));
// ─── S03: Phase lifecycle types ──────────────────────────────────────────────
/**
 * Steps in the phase lifecycle state machine.
 * Extends beyond the existing PhaseType enum (which covers session types)
 * to include the full lifecycle including 'advance'.
 */
export var PhaseStepType;
(function (PhaseStepType) {
    PhaseStepType["Discuss"] = "discuss";
    PhaseStepType["Research"] = "research";
    PhaseStepType["Plan"] = "plan";
    PhaseStepType["PlanCheck"] = "plan_check";
    PhaseStepType["Execute"] = "execute";
    PhaseStepType["Verify"] = "verify";
    PhaseStepType["Advance"] = "advance";
})(PhaseStepType || (PhaseStepType = {}));
//# sourceMappingURL=types.js.map