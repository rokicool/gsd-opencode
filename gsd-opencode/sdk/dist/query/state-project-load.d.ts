/**
 * `state load` — full project config + STATE.md raw text (CJS `cmdStateLoad`).
 *
 * Uses the same `loadConfig(cwd)` as `get-shit-done/bin/lib/state.cjs` by resolving
 * `core.cjs` next to a shipped/bundled/user `get-shit-done` install (same probe order
 * as `resolveGsdToolsPath`). This keeps JSON output **byte-compatible** with
 * `node gsd-tools.cjs state load` for monorepo and standard installs.
 *
 * Distinct from {@link stateJson} (`state json` / `state.json`) which mirrors
 * `cmdStateJson` (rebuilt frontmatter only).
 */
import type { QueryHandler } from './utils.js';
/**
 * Query handler for `state load` / bare `state` (normalize → `state.load`).
 *
 * Port of `cmdStateLoad` from `get-shit-done/bin/lib/state.cjs` lines 44–86.
 */
export declare const stateProjectLoad: QueryHandler;
/**
 * `--raw` stdout for `state load` (matches CJS `cmdStateLoad` lines 65–83).
 */
export declare function formatStateLoadRawStdout(data: unknown): string;
//# sourceMappingURL=state-project-load.d.ts.map