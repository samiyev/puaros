import { createHash } from "node:crypto"

/**
 * Calculate MD5 hash of content.
 */
export function md5(content: string): string {
    return createHash("md5").update(content).digest("hex")
}

/**
 * Calculate MD5 hash of file lines.
 */
export function hashLines(lines: string[]): string {
    return md5(lines.join("\n"))
}

/**
 * Generate short hash for IDs.
 */
export function shortHash(content: string, length = 8): string {
    return md5(content).slice(0, length)
}
