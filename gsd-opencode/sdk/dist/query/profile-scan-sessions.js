/**
 * Session scan — parity with `get-shit-done/bin/lib/profile-pipeline.cjs` `cmdScanSessions`.
 * Used by `scanSessions` query handler so SDK JSON matches `gsd-tools.cjs scan-sessions --json`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { homedir } from 'node:os';
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1048576)
        return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824)
        return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
}
/** Same as CJS `scanProjectDir` in profile-pipeline.cjs (sessions sorted newest-first). */
export function scanProjectDir(projectDirPath) {
    const entries = readdirSync(projectDirPath);
    const sessions = [];
    for (const entry of entries) {
        if (!entry.endsWith('.jsonl'))
            continue;
        const sessionId = entry.replace('.jsonl', '');
        const filePath = join(projectDirPath, entry);
        const stat = statSync(filePath);
        sessions.push({
            sessionId,
            filePath,
            size: stat.size,
            modified: stat.mtime,
        });
    }
    sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    return sessions;
}
export function readSessionIndex(projectDirPath) {
    try {
        const indexPath = join(projectDirPath, 'sessions-index.json');
        const raw = readFileSync(indexPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const entries = new Map();
        for (const entry of parsed.entries || []) {
            const e = entry;
            if (e.sessionId) {
                entries.set(e.sessionId, e);
            }
        }
        return { originalPath: parsed.originalPath ?? null, entries };
    }
    catch {
        return { originalPath: null, entries: new Map() };
    }
}
export function getProjectName(projectDirName, indexData) {
    if (indexData.originalPath) {
        return basename(indexData.originalPath);
    }
    return projectDirName;
}
/** Same resolution as CJS `getSessionsDir` in profile-pipeline.cjs. */
export function getScanSessionsRoot(overridePath) {
    const dir = overridePath || join(homedir(), '.claude', 'projects');
    if (!existsSync(dir))
        return null;
    return dir;
}
/**
 * Build the same project array as CJS `cmdScanSessions` (stdout JSON when `--json`).
 */
export function buildScanSessionsProjects(overridePath, options) {
    const sessionsDir = getScanSessionsRoot(overridePath);
    if (!sessionsDir) {
        return [];
    }
    let projectDirs;
    try {
        projectDirs = readdirSync(sessionsDir).filter((entry) => {
            const fullPath = join(sessionsDir, entry);
            try {
                return statSync(fullPath).isDirectory();
            }
            catch {
                return false;
            }
        });
    }
    catch {
        return [];
    }
    const projects = [];
    for (const dirName of projectDirs) {
        const projectPath = join(sessionsDir, dirName);
        const sessions = scanProjectDir(projectPath);
        if (sessions.length === 0)
            continue;
        const indexData = readSessionIndex(projectPath);
        const projectName = getProjectName(dirName, indexData);
        const totalSize = sessions.reduce((sum, s) => sum + s.size, 0);
        const lastActive = sessions[0].modified.toISOString();
        const oldest = sessions[sessions.length - 1].modified.toISOString();
        const newest = sessions[0].modified.toISOString();
        const project = {
            name: projectName,
            directory: dirName,
            sessionCount: sessions.length,
            totalSize,
            totalSizeHuman: formatBytes(totalSize),
            lastActive: lastActive.replace('T', ' ').substring(0, 19),
            dateRange: { first: oldest, last: newest },
        };
        if (options.verbose) {
            project.sessions = sessions.map((s) => {
                const indexed = indexData.entries.get(s.sessionId);
                const session = {
                    sessionId: s.sessionId,
                    size: s.size,
                    sizeHuman: formatBytes(s.size),
                    modified: s.modified.toISOString(),
                };
                if (indexed) {
                    if (indexed.summary)
                        session.summary = indexed.summary;
                    if (indexed.messageCount !== undefined)
                        session.messageCount = indexed.messageCount;
                    if (indexed.created)
                        session.created = indexed.created;
                }
                return session;
            });
        }
        projects.push(project);
    }
    projects.sort((a, b) => b.dateRange.last.localeCompare(a.dateRange.last));
    return projects;
}
//# sourceMappingURL=profile-scan-sessions.js.map