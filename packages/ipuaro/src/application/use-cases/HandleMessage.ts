import type { Session } from "../../domain/entities/Session.js"
import type { ILLMClient } from "../../domain/services/ILLMClient.js"
import type { ISessionStorage } from "../../domain/services/ISessionStorage.js"
import type { IStorage } from "../../domain/services/IStorage.js"
import type { DiffInfo } from "../../domain/services/ITool.js"
import {
    type ChatMessage,
    createAssistantMessage,
    createSystemMessage,
    createToolMessage,
    createUserMessage,
} from "../../domain/value-objects/ChatMessage.js"
import type { ToolCall } from "../../domain/value-objects/ToolCall.js"
import type { ToolResult } from "../../domain/value-objects/ToolResult.js"
import type { UndoEntry } from "../../domain/value-objects/UndoEntry.js"
import { type ErrorOption, IpuaroError } from "../../shared/errors/IpuaroError.js"
import {
    buildInitialContext,
    type ProjectStructure,
    SYSTEM_PROMPT,
    TOOL_REMINDER,
} from "../../infrastructure/llm/prompts.js"
import { parseToolCalls } from "../../infrastructure/llm/ResponseParser.js"
import type { IToolRegistry } from "../interfaces/IToolRegistry.js"
import { ContextManager } from "./ContextManager.js"
import { type ConfirmationResult, ExecuteTool } from "./ExecuteTool.js"

/**
 * Status during message handling.
 */
export type HandleMessageStatus =
    | "ready"
    | "thinking"
    | "tool_call"
    | "awaiting_confirmation"
    | "error"

/**
 * Edit request for confirmation.
 */
export interface EditRequest {
    toolCall: ToolCall
    filePath: string
    description: string
    diff?: DiffInfo
}

/**
 * User's choice for edit confirmation.
 */
export type EditChoice = "apply" | "skip" | "edit" | "abort"

/**
 * Event callbacks for HandleMessage.
 */
export interface HandleMessageEvents {
    onMessage?: (message: ChatMessage) => void
    onToolCall?: (call: ToolCall) => void
    onToolResult?: (result: ToolResult) => void
    onConfirmation?: (message: string, diff?: DiffInfo) => Promise<boolean | ConfirmationResult>
    onError?: (error: IpuaroError) => Promise<ErrorOption>
    onStatusChange?: (status: HandleMessageStatus) => void
    onUndoEntry?: (entry: UndoEntry) => void
}

/**
 * Options for HandleMessage.
 */
export interface HandleMessageOptions {
    autoApply?: boolean
    maxToolCalls?: number
    maxHistoryMessages?: number
    saveInputHistory?: boolean
    contextConfig?: import("../../shared/constants/config.js").ContextConfig
}

const DEFAULT_MAX_TOOL_CALLS = 20

/**
 * Use case for handling a user message.
 * Main orchestrator for the LLM interaction loop.
 */
export class HandleMessage {
    private readonly storage: IStorage
    private readonly sessionStorage: ISessionStorage
    private readonly llm: ILLMClient
    private readonly tools: IToolRegistry
    private readonly contextManager: ContextManager
    private readonly executeTool: ExecuteTool
    private readonly projectRoot: string
    private projectStructure?: ProjectStructure

    private events: HandleMessageEvents = {}
    private options: HandleMessageOptions = {}
    private aborted = false

    constructor(
        storage: IStorage,
        sessionStorage: ISessionStorage,
        llm: ILLMClient,
        tools: IToolRegistry,
        projectRoot: string,
        contextConfig?: import("../../shared/constants/config.js").ContextConfig,
    ) {
        this.storage = storage
        this.sessionStorage = sessionStorage
        this.llm = llm
        this.tools = tools
        this.projectRoot = projectRoot
        this.contextManager = new ContextManager(llm.getContextWindowSize(), contextConfig)
        this.executeTool = new ExecuteTool(storage, sessionStorage, tools, projectRoot)
    }

    /**
     * Set event callbacks.
     */
    setEvents(events: HandleMessageEvents): void {
        this.events = events
    }

    /**
     * Set options.
     */
    setOptions(options: HandleMessageOptions): void {
        this.options = options
    }

    /**
     * Set project structure for context building.
     */
    setProjectStructure(structure: ProjectStructure): void {
        this.projectStructure = structure
    }

    /**
     * Abort current processing.
     */
    abort(): void {
        this.aborted = true
        this.llm.abort()
    }

    /**
     * Truncate session history if maxHistoryMessages is set.
     */
    private truncateHistoryIfNeeded(session: Session): void {
        if (this.options.maxHistoryMessages !== undefined) {
            session.truncateHistory(this.options.maxHistoryMessages)
        }
    }

    /**
     * Execute the message handling flow.
     */
    async execute(session: Session, message: string): Promise<void> {
        this.aborted = false
        this.contextManager.syncFromSession(session)

        if (message.trim()) {
            const userMessage = createUserMessage(message)
            session.addMessage(userMessage)
            this.truncateHistoryIfNeeded(session)

            if (this.options.saveInputHistory !== false) {
                session.addInputToHistory(message)
            }

            this.emitMessage(userMessage)
        }

        await this.sessionStorage.saveSession(session)

        this.emitStatus("thinking")

        let toolCallCount = 0
        const maxToolCalls = this.options.maxToolCalls ?? DEFAULT_MAX_TOOL_CALLS

        while (!this.aborted) {
            const messages = await this.buildMessages(session)

            const startTime = Date.now()
            let response

            try {
                response = await this.llm.chat(messages)
            } catch (error) {
                await this.handleLLMError(error, session)
                return
            }

            if (this.aborted) {
                return
            }

            const parsed = parseToolCalls(response.content)
            const timeMs = Date.now() - startTime

            if (parsed.toolCalls.length === 0) {
                const assistantMessage = createAssistantMessage(parsed.content, undefined, {
                    tokens: response.tokens,
                    timeMs,
                    toolCalls: 0,
                })
                session.addMessage(assistantMessage)
                this.truncateHistoryIfNeeded(session)
                this.emitMessage(assistantMessage)
                this.contextManager.addTokens(response.tokens)
                this.contextManager.updateSession(session)
                await this.sessionStorage.saveSession(session)
                this.emitStatus("ready")
                return
            }

            const assistantMessage = createAssistantMessage(parsed.content, parsed.toolCalls, {
                tokens: response.tokens,
                timeMs,
                toolCalls: parsed.toolCalls.length,
            })
            session.addMessage(assistantMessage)
            this.truncateHistoryIfNeeded(session)
            this.emitMessage(assistantMessage)

            toolCallCount += parsed.toolCalls.length
            if (toolCallCount > maxToolCalls) {
                const errorMsg = `Maximum tool calls (${String(maxToolCalls)}) exceeded`
                const errorMessage = createSystemMessage(errorMsg)
                session.addMessage(errorMessage)
                this.truncateHistoryIfNeeded(session)
                this.emitMessage(errorMessage)
                this.emitStatus("ready")
                return
            }

            this.emitStatus("tool_call")

            const results: ToolResult[] = []

            for (const toolCall of parsed.toolCalls) {
                if (this.aborted) {
                    return
                }

                this.emitToolCall(toolCall)

                const result = await this.executeToolCall(toolCall, session)
                results.push(result)
                this.emitToolResult(result)
            }

            const toolMessage = createToolMessage(results)
            session.addMessage(toolMessage)
            this.truncateHistoryIfNeeded(session)

            this.contextManager.addTokens(response.tokens)

            if (this.contextManager.needsCompression()) {
                await this.contextManager.compress(session, this.llm)
            }

            this.contextManager.updateSession(session)
            await this.sessionStorage.saveSession(session)

            this.emitStatus("thinking")
        }
    }

    private async buildMessages(session: Session): Promise<ChatMessage[]> {
        const messages: ChatMessage[] = []

        messages.push(createSystemMessage(SYSTEM_PROMPT))

        if (this.projectStructure) {
            const asts = await this.storage.getAllASTs()
            const metas = await this.storage.getAllMetas()
            const context = buildInitialContext(this.projectStructure, asts, metas)
            messages.push(createSystemMessage(context))
        }

        messages.push(...session.history)

        // Add tool reminder if last message is from user (first LLM call for this query)
        const lastMessage = session.history[session.history.length - 1]
        if (lastMessage?.role === "user") {
            messages.push(createSystemMessage(TOOL_REMINDER))
        }

        return messages
    }

    private async executeToolCall(toolCall: ToolCall, session: Session): Promise<ToolResult> {
        const { result, undoEntryCreated, undoEntryId } = await this.executeTool.execute(
            toolCall,
            session,
            {
                autoApply: this.options.autoApply,
                onConfirmation: async (msg: string, diff?: DiffInfo) => {
                    this.emitStatus("awaiting_confirmation")
                    if (this.events.onConfirmation) {
                        return this.events.onConfirmation(msg, diff)
                    }
                    return true
                },
                onProgress: (_msg: string) => {
                    this.events.onStatusChange?.("tool_call")
                },
            },
        )

        if (undoEntryCreated && undoEntryId) {
            const undoEntry = session.undoStack.find((entry) => entry.id === undoEntryId)
            if (undoEntry) {
                this.events.onUndoEntry?.(undoEntry)
            }
        }

        return result
    }

    private async handleLLMError(error: unknown, session: Session): Promise<void> {
        this.emitStatus("error")

        const ipuaroError =
            error instanceof IpuaroError
                ? error
                : IpuaroError.llm(error instanceof Error ? error.message : String(error))

        if (this.events.onError) {
            const choice = await this.events.onError(ipuaroError)

            if (choice === "retry") {
                this.emitStatus("thinking")
                return this.execute(session, "")
            }
        }

        const errorMessage = createSystemMessage(`Error: ${ipuaroError.message}`)
        session.addMessage(errorMessage)
        this.truncateHistoryIfNeeded(session)
        this.emitMessage(errorMessage)

        this.emitStatus("ready")
    }

    private emitMessage(message: ChatMessage): void {
        this.events.onMessage?.(message)
    }

    private emitToolCall(call: ToolCall): void {
        this.events.onToolCall?.(call)
    }

    private emitToolResult(result: ToolResult): void {
        this.events.onToolResult?.(result)
    }

    private emitStatus(status: HandleMessageStatus): void {
        this.events.onStatusChange?.(status)
    }
}
