import { randomUUID } from "node:crypto"
import type { Session } from "../../domain/entities/Session.js"
import type { ISessionStorage } from "../../domain/services/ISessionStorage.js"
import type { IStorage } from "../../domain/services/IStorage.js"
import type { DiffInfo, ToolContext } from "../../domain/services/ITool.js"
import type { ToolCall } from "../../domain/value-objects/ToolCall.js"
import { createErrorResult, type ToolResult } from "../../domain/value-objects/ToolResult.js"
import { createUndoEntry } from "../../domain/value-objects/UndoEntry.js"
import type { IToolRegistry } from "../interfaces/IToolRegistry.js"

/**
 * Result of confirmation dialog.
 */
export interface ConfirmationResult {
    confirmed: boolean
    editedContent?: string[]
}

/**
 * Confirmation handler callback type.
 * Can return either a boolean (for backward compatibility) or a ConfirmationResult.
 */
export type ConfirmationHandler = (
    message: string,
    diff?: DiffInfo,
) => Promise<boolean | ConfirmationResult>

/**
 * Progress handler callback type.
 */
export type ProgressHandler = (message: string) => void

/**
 * Options for ExecuteTool.
 */
export interface ExecuteToolOptions {
    /** Auto-apply edits without confirmation */
    autoApply?: boolean
    /** Confirmation handler */
    onConfirmation?: ConfirmationHandler
    /** Progress handler */
    onProgress?: ProgressHandler
}

/**
 * Result of tool execution.
 */
export interface ExecuteToolResult {
    result: ToolResult
    undoEntryCreated: boolean
    undoEntryId?: string
}

/**
 * Use case for executing a single tool.
 * Orchestrates tool execution with:
 * - Parameter validation
 * - Confirmation flow
 * - Undo stack management
 * - Storage updates
 */
export class ExecuteTool {
    private readonly storage: IStorage
    private readonly sessionStorage: ISessionStorage
    private readonly tools: IToolRegistry
    private readonly projectRoot: string
    private lastUndoEntryId?: string

    constructor(
        storage: IStorage,
        sessionStorage: ISessionStorage,
        tools: IToolRegistry,
        projectRoot: string,
    ) {
        this.storage = storage
        this.sessionStorage = sessionStorage
        this.tools = tools
        this.projectRoot = projectRoot
    }

    /**
     * Execute a tool call.
     *
     * @param toolCall - The tool call to execute
     * @param session - Current session (for undo stack)
     * @param options - Execution options
     * @returns Execution result
     */
    async execute(
        toolCall: ToolCall,
        session: Session,
        options: ExecuteToolOptions = {},
    ): Promise<ExecuteToolResult> {
        this.lastUndoEntryId = undefined
        const startTime = Date.now()
        const tool = this.tools.get(toolCall.name)

        if (!tool) {
            return {
                result: createErrorResult(
                    toolCall.id,
                    `Unknown tool: ${toolCall.name}`,
                    Date.now() - startTime,
                ),
                undoEntryCreated: false,
            }
        }

        const validationError = tool.validateParams(toolCall.params)
        if (validationError) {
            return {
                result: createErrorResult(toolCall.id, validationError, Date.now() - startTime),
                undoEntryCreated: false,
            }
        }

        const context = this.buildToolContext(toolCall, session, options)

        try {
            const result = await tool.execute(toolCall.params, context)

            return {
                result,
                undoEntryCreated: this.lastUndoEntryId !== undefined,
                undoEntryId: this.lastUndoEntryId,
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                result: createErrorResult(toolCall.id, errorMessage, Date.now() - startTime),
                undoEntryCreated: false,
            }
        }
    }

    /**
     * Build tool context for execution.
     */
    private buildToolContext(
        toolCall: ToolCall,
        session: Session,
        options: ExecuteToolOptions,
    ): ToolContext {
        return {
            projectRoot: this.projectRoot,
            storage: this.storage,
            requestConfirmation: async (msg: string, diff?: DiffInfo) => {
                return this.handleConfirmation(msg, diff, toolCall, session, options)
            },
            onProgress: (msg: string) => {
                options.onProgress?.(msg)
            },
        }
    }

    /**
     * Handle confirmation for tool actions.
     * Supports edited content from user.
     */
    private async handleConfirmation(
        msg: string,
        diff: DiffInfo | undefined,
        toolCall: ToolCall,
        session: Session,
        options: ExecuteToolOptions,
    ): Promise<boolean> {
        if (options.autoApply) {
            if (diff) {
                this.lastUndoEntryId = await this.createUndoEntry(diff, toolCall, session)
            }
            return true
        }

        if (options.onConfirmation) {
            const result = await options.onConfirmation(msg, diff)

            const confirmed = typeof result === "boolean" ? result : result.confirmed
            const editedContent = typeof result === "boolean" ? undefined : result.editedContent

            if (confirmed && diff) {
                if (editedContent && editedContent.length > 0) {
                    diff.newLines = editedContent
                    if (toolCall.params.content && typeof toolCall.params.content === "string") {
                        toolCall.params.content = editedContent.join("\n")
                    }
                }

                this.lastUndoEntryId = await this.createUndoEntry(diff, toolCall, session)
            }

            return confirmed
        }

        if (diff) {
            this.lastUndoEntryId = await this.createUndoEntry(diff, toolCall, session)
        }
        return true
    }

    /**
     * Create undo entry from diff.
     */
    private async createUndoEntry(
        diff: DiffInfo,
        toolCall: ToolCall,
        session: Session,
    ): Promise<string> {
        const entryId = randomUUID()
        const entry = createUndoEntry(
            entryId,
            diff.filePath,
            diff.oldLines,
            diff.newLines,
            `${toolCall.name}: ${diff.filePath}`,
            toolCall.id,
        )

        session.addUndoEntry(entry)
        await this.sessionStorage.pushUndoEntry(session.id, entry)
        session.stats.editsApplied++

        return entryId
    }
}
