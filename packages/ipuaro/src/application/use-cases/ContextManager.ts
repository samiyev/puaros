import type { ContextState, Session } from "../../domain/entities/Session.js"
import type { ILLMClient } from "../../domain/services/ILLMClient.js"
import { type ChatMessage, createSystemMessage } from "../../domain/value-objects/ChatMessage.js"
import { CONTEXT_COMPRESSION_THRESHOLD, CONTEXT_WINDOW_SIZE } from "../../domain/constants/index.js"
import type { ContextConfig } from "../../shared/constants/config.js"

/**
 * File in context with token count.
 */
export interface FileContext {
    path: string
    tokens: number
    addedAt: number
}

/**
 * Compression result.
 */
export interface CompressionResult {
    compressed: boolean
    removedMessages: number
    tokensSaved: number
    summary?: string
}

const COMPRESSION_PROMPT = `Summarize the following conversation history in a concise way,
preserving key information about:
- What files were discussed or modified
- What changes were made
- Important decisions or context
Keep the summary under 500 tokens.`

const MESSAGES_TO_KEEP = 5
const MIN_MESSAGES_FOR_COMPRESSION = 10

/**
 * Manages context window token budget and compression.
 */
export class ContextManager {
    private readonly filesInContext = new Map<string, FileContext>()
    private currentTokens = 0
    private readonly contextWindowSize: number
    private readonly compressionThreshold: number
    private readonly compressionMethod: "llm-summary" | "truncate"

    constructor(contextWindowSize: number = CONTEXT_WINDOW_SIZE, config?: ContextConfig) {
        this.contextWindowSize = contextWindowSize
        this.compressionThreshold = config?.autoCompressAt ?? CONTEXT_COMPRESSION_THRESHOLD
        this.compressionMethod = config?.compressionMethod ?? "llm-summary"
    }

    /**
     * Add a file to the context.
     */
    addToContext(file: string, tokens: number): void {
        const existing = this.filesInContext.get(file)
        if (existing) {
            this.currentTokens -= existing.tokens
        }

        this.filesInContext.set(file, {
            path: file,
            tokens,
            addedAt: Date.now(),
        })
        this.currentTokens += tokens
    }

    /**
     * Remove a file from the context.
     */
    removeFromContext(file: string): void {
        const existing = this.filesInContext.get(file)
        if (existing) {
            this.currentTokens -= existing.tokens
            this.filesInContext.delete(file)
        }
    }

    /**
     * Get current token usage ratio (0-1).
     */
    getUsage(): number {
        return this.currentTokens / this.contextWindowSize
    }

    /**
     * Get current token count.
     */
    getTokenCount(): number {
        return this.currentTokens
    }

    /**
     * Get available tokens.
     */
    getAvailableTokens(): number {
        return this.contextWindowSize - this.currentTokens
    }

    /**
     * Check if compression is needed.
     */
    needsCompression(): boolean {
        return this.getUsage() > this.compressionThreshold
    }

    /**
     * Update token count (e.g., after receiving a message).
     */
    addTokens(tokens: number): void {
        this.currentTokens += tokens
    }

    /**
     * Get files in context.
     */
    getFilesInContext(): string[] {
        return Array.from(this.filesInContext.keys())
    }

    /**
     * Sync context state from session.
     */
    syncFromSession(session: Session): void {
        this.filesInContext.clear()
        this.currentTokens = 0

        for (const file of session.context.filesInContext) {
            this.filesInContext.set(file, {
                path: file,
                tokens: 0,
                addedAt: Date.now(),
            })
        }

        this.currentTokens = Math.floor(session.context.tokenUsage * this.contextWindowSize)
    }

    /**
     * Update session context state.
     */
    updateSession(session: Session): void {
        session.context.filesInContext = this.getFilesInContext()
        session.context.tokenUsage = this.getUsage()
        session.context.needsCompression = this.needsCompression()
    }

    /**
     * Compress context using LLM to summarize old messages.
     */
    async compress(session: Session, llm: ILLMClient): Promise<CompressionResult> {
        const history = session.history
        if (history.length < MIN_MESSAGES_FOR_COMPRESSION) {
            return {
                compressed: false,
                removedMessages: 0,
                tokensSaved: 0,
            }
        }

        const messagesToCompress = history.slice(0, -MESSAGES_TO_KEEP)
        const messagesToKeep = history.slice(-MESSAGES_TO_KEEP)

        const tokensBeforeCompression = await this.countHistoryTokens(messagesToCompress, llm)

        const summary = await this.summarizeMessages(messagesToCompress, llm)
        const summaryTokens = await llm.countTokens(summary)

        const summaryMessage = createSystemMessage(`[Previous conversation summary]\n${summary}`)

        session.history = [summaryMessage, ...messagesToKeep]

        const tokensSaved = tokensBeforeCompression - summaryTokens
        this.currentTokens -= tokensSaved

        this.updateSession(session)

        return {
            compressed: true,
            removedMessages: messagesToCompress.length,
            tokensSaved,
            summary,
        }
    }

    /**
     * Create a new context state.
     */
    static createInitialState(): ContextState {
        return {
            filesInContext: [],
            tokenUsage: 0,
            needsCompression: false,
        }
    }

    private async summarizeMessages(messages: ChatMessage[], llm: ILLMClient): Promise<string> {
        const conversation = this.formatMessagesForSummary(messages)

        const response = await llm.chat([
            createSystemMessage(COMPRESSION_PROMPT),
            createSystemMessage(conversation),
        ])

        return response.content
    }

    private formatMessagesForSummary(messages: ChatMessage[]): string {
        return messages
            .filter((m) => m.role !== "tool")
            .map((m) => {
                const role = m.role === "user" ? "User" : "Assistant"
                const content = this.truncateContent(m.content, 500)
                return `${role}: ${content}`
            })
            .join("\n\n")
    }

    private truncateContent(content: string, maxLength: number): string {
        if (content.length <= maxLength) {
            return content
        }
        return `${content.slice(0, maxLength)}...`
    }

    private async countHistoryTokens(messages: ChatMessage[], llm: ILLMClient): Promise<number> {
        let total = 0
        for (const message of messages) {
            total += await llm.countTokens(message.content)
        }
        return total
    }
}
