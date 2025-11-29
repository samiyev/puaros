/**
 * Redis key schema for ipuaro data storage.
 *
 * Key structure:
 * - project:{name}:files      # Hash<path, FileData>
 * - project:{name}:ast        # Hash<path, FileAST>
 * - project:{name}:meta       # Hash<path, FileMeta>
 * - project:{name}:indexes    # Hash<name, JSON> (symbols, deps_graph)
 * - project:{name}:config     # Hash<key, JSON>
 *
 * - session:{id}:data         # Hash<field, JSON> (history, context, stats)
 * - session:{id}:undo         # List<UndoEntry> (max 10)
 * - sessions:list             # List<session_id>
 *
 * Project name format: {parent-folder}-{project-folder}
 */

/**
 * Project-related Redis keys.
 */
export const ProjectKeys = {
    files: (projectName: string): string => `project:${projectName}:files`,
    ast: (projectName: string): string => `project:${projectName}:ast`,
    meta: (projectName: string): string => `project:${projectName}:meta`,
    indexes: (projectName: string): string => `project:${projectName}:indexes`,
    config: (projectName: string): string => `project:${projectName}:config`,
} as const

/**
 * Session-related Redis keys.
 */
export const SessionKeys = {
    data: (sessionId: string): string => `session:${sessionId}:data`,
    undo: (sessionId: string): string => `session:${sessionId}:undo`,
    list: "sessions:list",
} as const

/**
 * Index field names within project:indexes hash.
 */
export const IndexFields = {
    symbols: "symbols",
    depsGraph: "deps_graph",
} as const

/**
 * Session data field names within session:data hash.
 */
export const SessionFields = {
    history: "history",
    context: "context",
    stats: "stats",
    inputHistory: "input_history",
    createdAt: "created_at",
    lastActivityAt: "last_activity_at",
    projectName: "project_name",
} as const

/**
 * Generate project name from path.
 * Format: {parent-folder}-{project-folder}
 *
 * @example
 * generateProjectName("/home/user/projects/myapp") -> "projects-myapp"
 * generateProjectName("/app") -> "app"
 */
export function generateProjectName(projectPath: string): string {
    const normalized = projectPath.replace(/\\/g, "/").replace(/\/+$/, "")
    const parts = normalized.split("/").filter(Boolean)

    if (parts.length === 0) {
        return "root"
    }

    if (parts.length === 1) {
        return sanitizeName(parts[0])
    }

    const projectFolder = sanitizeName(parts[parts.length - 1])
    const parentFolder = sanitizeName(parts[parts.length - 2])

    return `${parentFolder}-${projectFolder}`
}

/**
 * Sanitize a name for use in Redis keys.
 * Replaces non-alphanumeric characters with hyphens.
 */
function sanitizeName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
}
