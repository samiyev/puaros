/**
 * Simple token estimation utilities.
 * Uses approximation: ~4 characters per token for English text.
 */

const CHARS_PER_TOKEN = 4

/**
 * Estimate token count for text.
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Estimate token count for array of strings.
 */
export function estimateTokensForLines(lines: string[]): number {
    return estimateTokens(lines.join("\n"))
}

/**
 * Truncate text to approximate token limit.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * CHARS_PER_TOKEN
    if (text.length <= maxChars) {
        return text
    }
    return `${text.slice(0, maxChars)}...`
}

/**
 * Format token count for display.
 */
export function formatTokenCount(tokens: number): string {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}k`
    }
    return tokens.toString()
}
