import type { ChatMessage } from "../value-objects/ChatMessage.js"
import type { UndoEntry } from "../value-objects/UndoEntry.js"
import { MAX_UNDO_STACK_SIZE } from "../constants/index.js"

/**
 * Session statistics.
 */
export interface SessionStats {
    /** Total tokens used */
    totalTokens: number
    /** Total time in milliseconds */
    totalTimeMs: number
    /** Number of tool calls made */
    toolCalls: number
    /** Number of edits applied */
    editsApplied: number
    /** Number of edits rejected */
    editsRejected: number
}

/**
 * Context state for the session.
 */
export interface ContextState {
    /** Files currently in context */
    filesInContext: string[]
    /** Estimated token usage (0-1) */
    tokenUsage: number
    /** Whether compression is needed */
    needsCompression: boolean
}

/**
 * Session entity representing a chat session.
 */
export class Session {
    readonly id: string
    readonly projectName: string
    readonly createdAt: number
    lastActivityAt: number
    history: ChatMessage[]
    context: ContextState
    undoStack: UndoEntry[]
    stats: SessionStats
    inputHistory: string[]

    constructor(id: string, projectName: string, createdAt?: number) {
        this.id = id
        this.projectName = projectName
        this.createdAt = createdAt ?? Date.now()
        this.lastActivityAt = this.createdAt
        this.history = []
        this.context = {
            filesInContext: [],
            tokenUsage: 0,
            needsCompression: false,
        }
        this.undoStack = []
        this.stats = {
            totalTokens: 0,
            totalTimeMs: 0,
            toolCalls: 0,
            editsApplied: 0,
            editsRejected: 0,
        }
        this.inputHistory = []
    }

    addMessage(message: ChatMessage): void {
        this.history.push(message)
        this.lastActivityAt = Date.now()

        if (message.stats) {
            this.stats.totalTokens += message.stats.tokens
            this.stats.totalTimeMs += message.stats.timeMs
            this.stats.toolCalls += message.stats.toolCalls
        }
    }

    addUndoEntry(entry: UndoEntry): void {
        this.undoStack.push(entry)
        if (this.undoStack.length > MAX_UNDO_STACK_SIZE) {
            this.undoStack.shift()
        }
    }

    popUndoEntry(): UndoEntry | undefined {
        return this.undoStack.pop()
    }

    addInputToHistory(input: string): void {
        if (input.trim() && this.inputHistory[this.inputHistory.length - 1] !== input) {
            this.inputHistory.push(input)
        }
    }

    clearHistory(): void {
        this.history = []
        this.context = {
            filesInContext: [],
            tokenUsage: 0,
            needsCompression: false,
        }
    }

    getSessionDurationMs(): number {
        return Date.now() - this.createdAt
    }

    getSessionDurationFormatted(): string {
        const totalMinutes = Math.floor(this.getSessionDurationMs() / 60_000)
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60

        if (hours > 0) {
            return `${String(hours)}h ${String(minutes)}m`
        }
        return `${String(minutes)}m`
    }
}
