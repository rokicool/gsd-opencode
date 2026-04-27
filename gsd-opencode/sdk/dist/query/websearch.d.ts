/**
 * Web search query handler — Brave Search API integration.
 *
 * Provides web search for researcher agents. Returns { available: false }
 * gracefully when BRAVE_API_KEY is missing so agents can fall back to
 * built-in WebSearch tools.
 *
 * @example
 * ```typescript
 * import { websearch } from './websearch.js';
 *
 * await websearch(['typescript generics'], '/project');
 * // { data: { available: true, query: 'typescript generics', count: 10, results: [...] } }
 * ```
 */
import type { QueryHandler } from './utils.js';
/**
 * Search the web via Brave Search API.
 * Requires BRAVE_API_KEY env var.
 *
 * Args: query [--limit N] [--freshness day|week|month]
 */
export declare const websearch: QueryHandler;
//# sourceMappingURL=websearch.d.ts.map