/**
 * Prompt sanitizer — resolves @-file references and strips interactive CLI
 * patterns from GSD-1 prompts so they're safe for headless SDK use.
 *
 * @-file references (e.g., @~/.claude/get-shit-done/references/foo.md) are
 * resolved by reading the file and inlining the content. This preserves the
 * critical instructions that the real agent prompts depend on.
 *
 * Patterns removed (interactive-only, not useful headless):
 * - /gsd-... skill commands (can't invoke skills in Agent SDK)
 * - AskUserQuestion(...) calls
 * - STOP directives in interactive contexts
 * - SlashCommand() calls
 * - 'wait for user' / 'ask the user' instructions
 */
/**
 * Resolve @-file references by reading the file and inlining the content.
 * References that can't be resolved (file not found) are removed silently.
 *
 * @param input - Prompt text with @-references
 * @param projectDir - Project directory for resolving relative paths
 * @returns Prompt with @-references replaced by file contents
 */
export declare function resolveAtReferences(input: string, projectDir?: string): string;
/**
 * Sanitize a prompt for headless SDK use:
 * 1. Resolve @-file references (inline the content)
 * 2. Strip interactive-only patterns
 *
 * @param input - Raw prompt string from agent/workflow files
 * @param projectDir - Project directory for resolving relative @-references
 * @returns Cleaned prompt ready for Agent SDK use
 */
export declare function sanitizePrompt(input: string, projectDir?: string): string;
//# sourceMappingURL=prompt-sanitizer.d.ts.map