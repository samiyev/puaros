import { type Message, Ollama, type Tool } from "ollama"
import type { ILLMClient, LLMResponse } from "../../domain/services/ILLMClient.js"
import type { ChatMessage } from "../../domain/value-objects/ChatMessage.js"
import { createToolCall, type ToolCall } from "../../domain/value-objects/ToolCall.js"
import type { LLMConfig } from "../../shared/constants/config.js"
import { IpuaroError } from "../../shared/errors/IpuaroError.js"
import { estimateTokens } from "../../shared/utils/tokens.js"
import { parseToolCalls } from "./ResponseParser.js"
import { getOllamaNativeTools } from "./toolDefs.js"

/**
 * Ollama LLM client implementation.
 * Wraps the Ollama SDK for chat completions with tool support.
 * Supports both XML-based and native Ollama tool calling.
 */
export class OllamaClient implements ILLMClient {
    private readonly client: Ollama
    private readonly host: string
    private readonly model: string
    private readonly contextWindow: number
    private readonly temperature: number
    private readonly timeout: number
    private readonly useNativeTools: boolean
    private abortController: AbortController | null = null

    constructor(config: LLMConfig) {
        this.host = config.host
        this.client = new Ollama({ host: this.host })
        this.model = config.model
        this.contextWindow = config.contextWindow
        this.temperature = config.temperature
        this.timeout = config.timeout
        this.useNativeTools = config.useNativeTools ?? false
    }

    /**
     * Send messages to LLM and get response.
     * Supports both XML-based tool calling and native Ollama tools.
     */
    async chat(messages: ChatMessage[]): Promise<LLMResponse> {
        const startTime = Date.now()
        this.abortController = new AbortController()

        try {
            const ollamaMessages = this.convertMessages(messages)

            if (this.useNativeTools) {
                return await this.chatWithNativeTools(ollamaMessages, startTime)
            }

            return await this.chatWithXMLTools(ollamaMessages, startTime)
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw IpuaroError.llm("Request was aborted")
            }
            throw this.handleError(error)
        } finally {
            this.abortController = null
        }
    }

    /**
     * Chat using XML-based tool calling (legacy mode).
     */
    private async chatWithXMLTools(
        ollamaMessages: Message[],
        startTime: number,
    ): Promise<LLMResponse> {
        const response = await this.client.chat({
            model: this.model,
            messages: ollamaMessages,
            options: {
                temperature: this.temperature,
            },
            stream: false,
        })

        const timeMs = Date.now() - startTime
        const parsed = parseToolCalls(response.message.content)

        return {
            content: parsed.content,
            toolCalls: parsed.toolCalls,
            tokens: response.eval_count ?? estimateTokens(response.message.content),
            timeMs,
            truncated: false,
            stopReason: this.determineStopReason(response, parsed.toolCalls),
        }
    }

    /**
     * Chat using native Ollama tool calling.
     */
    private async chatWithNativeTools(
        ollamaMessages: Message[],
        startTime: number,
    ): Promise<LLMResponse> {
        const nativeTools = getOllamaNativeTools() as Tool[]

        const response = await this.client.chat({
            model: this.model,
            messages: ollamaMessages,
            tools: nativeTools,
            options: {
                temperature: this.temperature,
            },
            stream: false,
        })

        const timeMs = Date.now() - startTime
        let toolCalls = this.parseNativeToolCalls(response.message.tool_calls)

        // Fallback: some models return tool calls as JSON in content
        if (toolCalls.length === 0 && response.message.content) {
            toolCalls = this.parseToolCallsFromContent(response.message.content)
        }

        const content = toolCalls.length > 0 ? "" : response.message.content || ""

        return {
            content,
            toolCalls,
            tokens: response.eval_count ?? estimateTokens(response.message.content || ""),
            timeMs,
            truncated: false,
            stopReason: toolCalls.length > 0 ? "tool_use" : "end",
        }
    }

    /**
     * Parse native Ollama tool calls into ToolCall format.
     */
    private parseNativeToolCalls(
        nativeToolCalls?: { function: { name: string; arguments: Record<string, unknown> } }[],
    ): ToolCall[] {
        if (!nativeToolCalls || nativeToolCalls.length === 0) {
            return []
        }

        return nativeToolCalls.map((tc, index) =>
            createToolCall(
                `native_${String(Date.now())}_${String(index)}`,
                tc.function.name,
                tc.function.arguments,
            ),
        )
    }

    /**
     * Parse tool calls from content (fallback for models that return JSON in content).
     * Supports format: {"name": "tool_name", "arguments": {...}}
     */
    private parseToolCallsFromContent(content: string): ToolCall[] {
        const toolCalls: ToolCall[] = []

        // Try to parse JSON objects from content
        const jsonRegex = /\{[\s\S]*?"name"[\s\S]*?"arguments"[\s\S]*?\}/g
        const matches = content.match(jsonRegex)

        if (!matches) {
            return toolCalls
        }

        for (const match of matches) {
            try {
                const parsed = JSON.parse(match) as {
                    name?: string
                    arguments?: Record<string, unknown>
                }
                if (parsed.name && typeof parsed.name === "string") {
                    toolCalls.push(
                        createToolCall(
                            `json_${String(Date.now())}_${String(toolCalls.length)}`,
                            parsed.name,
                            parsed.arguments ?? {},
                        ),
                    )
                }
            } catch {
                // Invalid JSON, skip
            }
        }

        return toolCalls
    }

    /**
     * Count tokens in text.
     * Uses estimation since Ollama doesn't provide a tokenizer endpoint.
     */
    async countTokens(text: string): Promise<number> {
        return Promise.resolve(estimateTokens(text))
    }

    /**
     * Check if LLM service is available.
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.client.list()
            return true
        } catch {
            return false
        }
    }

    /**
     * Get current model name.
     */
    getModelName(): string {
        return this.model
    }

    /**
     * Get context window size.
     */
    getContextWindowSize(): number {
        return this.contextWindow
    }

    /**
     * Pull/download model if not available locally.
     */
    async pullModel(model: string): Promise<void> {
        try {
            await this.client.pull({ model, stream: false })
        } catch (error) {
            throw this.handleError(error, `Failed to pull model: ${model}`)
        }
    }

    /**
     * Check if a specific model is available locally.
     */
    async hasModel(model: string): Promise<boolean> {
        try {
            const result = await this.client.list()
            return result.models.some((m) => m.name === model || m.name.startsWith(`${model}:`))
        } catch {
            return false
        }
    }

    /**
     * List available models.
     */
    async listModels(): Promise<string[]> {
        try {
            const result = await this.client.list()
            return result.models.map((m) => m.name)
        } catch (error) {
            throw this.handleError(error, "Failed to list models")
        }
    }

    /**
     * Abort current generation.
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort()
        }
    }

    /**
     * Convert ChatMessage array to Ollama Message format.
     */
    private convertMessages(messages: ChatMessage[]): Message[] {
        return messages.map((msg): Message => {
            const role = this.convertRole(msg.role)

            if (msg.role === "tool" && msg.toolResults) {
                return {
                    role: "tool",
                    content: msg.content,
                }
            }

            if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
                return {
                    role: "assistant",
                    content: msg.content,
                    tool_calls: msg.toolCalls.map((tc) => ({
                        function: {
                            name: tc.name,
                            arguments: tc.params,
                        },
                    })),
                }
            }

            return {
                role,
                content: msg.content,
            }
        })
    }

    /**
     * Convert message role to Ollama role.
     */
    private convertRole(role: ChatMessage["role"]): "user" | "assistant" | "system" | "tool" {
        switch (role) {
            case "user":
                return "user"
            case "assistant":
                return "assistant"
            case "system":
                return "system"
            case "tool":
                return "tool"
            default:
                return "user"
        }
    }

    /**
     * Determine stop reason from response.
     */
    private determineStopReason(
        response: { done_reason?: string },
        toolCalls: { name: string; params: Record<string, unknown> }[],
    ): "end" | "length" | "tool_use" {
        if (toolCalls.length > 0) {
            return "tool_use"
        }

        if (response.done_reason === "length") {
            return "length"
        }

        return "end"
    }

    /**
     * Handle and wrap errors.
     */
    private handleError(error: unknown, context?: string): IpuaroError {
        const message = error instanceof Error ? error.message : String(error)
        const fullMessage = context ? `${context}: ${message}` : message

        if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
            return IpuaroError.llm(`Cannot connect to Ollama at ${this.host}`)
        }

        if (message.includes("model") && message.includes("not found")) {
            return IpuaroError.llm(
                `Model "${this.model}" not found. Run: ollama pull ${this.model}`,
            )
        }

        return IpuaroError.llm(fullMessage)
    }
}
