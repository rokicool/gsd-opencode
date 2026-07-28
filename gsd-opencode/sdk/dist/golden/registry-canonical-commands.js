/**
 * Canonical registry command strings for golden parity — one primary name per unique
 * native handler (dedupes dotted vs space-delimited aliases on the same function).
 */
import { createRegistry } from '../query/index.js';
export function getCanonicalRegistryCommands() {
    const registry = createRegistry();
    const byHandler = new Map();
    for (const cmd of registry.commands()) {
        const h = registry.getHandler(cmd);
        if (!h)
            continue;
        const list = byHandler.get(h) ?? [];
        list.push(cmd);
        byHandler.set(h, list);
    }
    const out = [];
    for (const cmds of byHandler.values()) {
        cmds.sort((a, b) => a.localeCompare(b));
        const dotted = cmds.find((c) => c.includes('.'));
        if (dotted) {
            out.push(dotted);
            continue;
        }
        const kebab = cmds.find((c) => c.includes('-'));
        out.push(kebab ?? cmds[0]);
    }
    return out.sort((a, b) => a.localeCompare(b));
}
//# sourceMappingURL=registry-canonical-commands.js.map