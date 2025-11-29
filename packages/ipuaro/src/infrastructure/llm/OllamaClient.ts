import { Ollama } from "ollama"
import type { ILLMClient, LLMResponse, ToolDef } from "../../domain/services/ILLMClient.js"
import type { ChatMessage } from "../../domain/value-objects/ChatMessage.js"
import type { ToolCall } from "../../domain/value-objects/ToolCall.js"
import type { LLMConfig } from "../../shared/constants/config.js"
import { IpuaroError } from "../../shared/errors/IpuaroError.js"
import { estimateTokens } from "../../shared/utils/tokens.js"

/**
 * Ollama LLM client implementation.
 * Provides chat, token counting, and model management.
 */
export class OllamaClient implements ILLMClient {
    private readonly client: Ollama
    private readonly config: LLMConfig
    private abortController: AbortController | null = null

    constructor(config: LLMConfig) {
        this.config = config
        this.client = new Ollama({ host: config.host })
    }

    /**
     * Send messages to LLM and get response.
     */
    async chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<LLMResponse> {
        const startTime = Date.now()
        this.abortController = new AbortController()

        try {
            const ollamaMessages = this.convertMessages(messages)
            const ollamaTools = tools ? this.convertTools(tools) : undefined

            const response = await this.client.chat({
                model: this.config.model,
                messages: ollamaMessages,
                tools: ollamaTools,
                options: {
                    temperature: this.config.temperature,
                    num_ctx: this.config.contextWindow,
                },
                stream: false,
            })

            const timeMs = Date.now() - startTime
            const toolCalls = this.parseToolCalls(response)

            return {
                content: response.message.content,
                toolCalls,
                tokens: response.eval_count ?? estimateTokens(response.message.content),
                timeMs,
                truncated: false,
                stopReason: toolCalls.length > 0 ? "tool_use" : "end",
            }
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw IpuaroError.llm("Generation was aborted")
            }

            const message = error instanceof Error ? error.message : "Unknown error"
            throw IpuaroError.llm(`Ollama chat failed: ${message}`)
        } finally {
            this.abortController = null
        }
    }

    /**
     * Count tokens in text.
     * Uses estimation since Ollama doesn't provide exact token count.
     */
    async countTokens(text: string): Promise<number> {
        return await Promise.resolve(estimateTokens(text))
    }

    /**
     * Check if Ollama service is available.
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
        return this.config.model
    }

    /**
     * Get context window size.
     */
    getContextWindowSize(): number {
        return this.config.contextWindow
    }

    /**
     * Pull/download model if not available locally.
     */
    async pullModel(model: string): Promise<void> {
        try {
            await this.client.pull({ model, stream: false })
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error"
            throw IpuaroError.llm(`Failed to pull model ${model}: ${message}`)
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
     * Check if a specific model is available locally.
     */
    async hasModel(model: string): Promise<boolean> {
        try {
            const response = await this.client.list()
            return response.models.some((m) => m.name === model || m.name.startsWith(`${model}:`))
        } catch {
            return false
        }
    }

    /**
     * List available models.
     */
    async listModels(): Promise<string[]> {
        try {
            const response = await this.client.list()
            return response.models.map((m) => m.name)
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error"
            throw IpuaroError.llm(`Failed to list models: ${message}`)
        }
    }

    /**
     * Convert ChatMessage[] to Ollama message format.
     */
    private convertMessages(messages: ChatMessage[]): OllamaMessage[] {
        return messages.map((msg) => ({
            role: this.mapRole(msg.role),
            content: msg.content,
        }))
    }

    /**
     * Map internal role to Ollama role.
     */
    private mapRole(role: ChatMessage["role"]): "user" | "assistant" | "system" {
        if (role === "tool") {
            return "user"
        }
        return role
    }

    /**
     * Convert ToolDef[] to Ollama tool format.
     */
    private convertTools(tools: ToolDef[]): OllamaTool[] {
        return tools.map((tool) => ({
            type: "function" as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: "object" as const,
                    properties: this.convertParameters(tool.parameters),
                    required: tool.parameters.filter((p) => p.required).map((p) => p.name),
                },
            },
        }))
    }

    /**
     * Convert ToolParameter[] to JSON Schema properties.
     */
    private convertParameters(
        params: ToolDef["parameters"],
    ): Record<string, OllamaParameterProperty> {
        const properties: Record<string, OllamaParameterProperty> = {}

        for (const param of params) {
            properties[param.name] = {
                type: param.type,
                description: param.description,
                ...(param.enum ? { enum: param.enum } : {}),
            }
        }

        return properties
    }

    /**
     * Parse tool calls from Ollama response.
     */
    private parseToolCalls(response: OllamaChatResponse): ToolCall[] {
        if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
            return []
        }

        return response.message.tool_calls.map((tc, index) => ({
            id: `call_${String(Date.now())}_${String(index)}`,
            name: tc.function.name,
            params: tc.function.arguments as Record<string, unknown>,
            timestamp: Date.now(),
        }))
    }
}

/**
 * Ollama message type (internal).
 */
interface OllamaMessage {
    role: "user" | "assistant" | "system"
    content: string
}

/**
 * Ollama tool type (internal).
 */
interface OllamaTool {
    type: "function"
    function: {
        name: string
        description: string
        parameters: {
            type: "object"
            properties: Record<string, OllamaParameterProperty>
            required: string[]
        }
    }
}

/**
 * Ollama parameter property type.
 */
interface OllamaParameterProperty {
    type: string
    description: string
    enum?: string[]
}

/**
 * Ollama chat response type (subset).
 */
interface OllamaToolCall {
    function: {
        name: string
        arguments: unknown
    }
}

interface OllamaChatResponse {
    message: {
        content: string
        tool_calls?: OllamaToolCall[]
    }
    eval_count?: number
}
