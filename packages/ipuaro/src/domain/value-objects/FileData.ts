/**
 * Represents file content with metadata for change detection.
 */
export interface FileData {
    /** File content split into lines */
    lines: string[]
    /** MD5 hash for change detection */
    hash: string
    /** File size in bytes */
    size: number
    /** Last modification timestamp (ms) */
    lastModified: number
}

export function createFileData(
    lines: string[],
    hash: string,
    size: number,
    lastModified: number,
): FileData {
    return { lines, hash, size, lastModified }
}

export function isFileDataEqual(a: FileData, b: FileData): boolean {
    return a.hash === b.hash
}
