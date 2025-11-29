/**
 * Represents an undo entry for file changes.
 */

export interface UndoEntry {
    /** Unique identifier */
    id: string
    /** Timestamp when change was made */
    timestamp: number
    /** File path that was modified */
    filePath: string
    /** Content before the change */
    previousContent: string[]
    /** Content after the change */
    newContent: string[]
    /** Human-readable description of the change */
    description: string
    /** Tool call ID that made this change */
    toolCallId?: string
}

export function createUndoEntry(
    id: string,
    filePath: string,
    previousContent: string[],
    newContent: string[],
    description: string,
    toolCallId?: string,
): UndoEntry {
    return {
        id,
        timestamp: Date.now(),
        filePath,
        previousContent,
        newContent,
        description,
        toolCallId,
    }
}

export function canUndo(entry: UndoEntry, currentContent: string[]): boolean {
    return arraysEqual(entry.newContent, currentContent)
}

function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false
    }
    return a.every((line, i) => line === b[i])
}
