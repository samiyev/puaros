import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { LLMConfig } from "../../../../src/shared/constants/config.js"
import type { ChatMessage } from "../../../../src/domain/value-objects/ChatMessage.js"
import type { ToolDef } from "../../../../src/domain/services/ILLMClient.js"
import { IpuaroError } from "../../../../src/shared/errors/IpuaroError.js"

const mockOllamaInstance = {
    chat: vi.fn(),
    list: vi.fn(),
    pull: vi.fn(),
}

vi.mock("ollama", () => {
    return {
        Ollama: vi.fn(() => mockOllamaInstance),
    }
})

const { OllamaClient } = await import("../../../../src/infrastructure/llm/OllamaClient.js")

describe("OllamaClient", () => {
    const defaultConfig: LLMConfig = {
        model: "qwen2.5-coder:7b-instruct",
        contextWindow: 128_000,
        temperature: 0.1,
        host: "http://localhost:11434",
        timeout: 120_000,
    }

    const createMessage = (role: ChatMessage["role"], content: string): ChatMessage => ({
        role,
        content,
        timestamp: Date.now(),
    })

    beforeEach(() => {
        vi.clearAllMocks()
        mockOllamaInstance.chat.mockResolvedValue({
            message: {
                content: "Hello! How can I help you?",
            },
            eval_count: 10,
        })
        mockOllamaInstance.list.mockResolvedValue({
            models: [
                { name: "qwen2.5-coder:7b-instruct" },
                { name: "llama2:latest" },
            ],
        })
        mockOllamaInstance.pull.mockResolvedValue(undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe("constructor", () => {
        it("should create instance with config", () => {
            const client = new OllamaClient(defaultConfig)
            expect(client).toBeDefined()
            expect(client.getModelName()).toBe(defaultConfig.model)
        })
    })

    describe("chat", () => {
        it("should send messages and return response", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [
                createMessage("user", "Hello"),
            ]

            const response = await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith({
                model: defaultConfig.model,
                messages: [{ role: "user", content: "Hello" }],
                tools: undefined,
                options: {
                    temperature: defaultConfig.temperature,
                    num_ctx: defaultConfig.contextWindow,
                },
                stream: false,
            })
            expect(response.content).toBe("Hello! How can I help you?")
            expect(response.tokens).toBe(10)
            expect(response.stopReason).toBe("end")
        })

        it("should convert system messages correctly", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [
                createMessage("system", "You are a helpful assistant"),
                createMessage("user", "Hello"),
            ]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        { role: "system", content: "You are a helpful assistant" },
                        { role: "user", content: "Hello" },
                    ],
                }),
            )
        })

        it("should convert tool messages to user role", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [
                createMessage("user", "Read file"),
                createMessage("assistant", "I will read the file"),
                createMessage("tool", "[call_123] Success: {\"content\": \"file content\"}"),
            ]

            await client.chat(messages)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        { role: "user", content: "Read file" },
                        { role: "assistant", content: "I will read the file" },
                        { role: "user", content: "[call_123] Success: {\"content\": \"file content\"}" },
                    ],
                }),
            )
        })

        it("should pass tools when provided", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]
            const tools: ToolDef[] = [
                {
                    name: "get_lines",
                    description: "Get lines from a file",
                    parameters: [
                        {
                            name: "path",
                            type: "string",
                            description: "File path",
                            required: true,
                        },
                        {
                            name: "start",
                            type: "number",
                            description: "Start line",
                            required: false,
                        },
                    ],
                },
            ]

            await client.chat(messages, tools)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "get_lines",
                                description: "Get lines from a file",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        path: {
                                            type: "string",
                                            description: "File path",
                                        },
                                        start: {
                                            type: "number",
                                            description: "Start line",
                                        },
                                    },
                                    required: ["path"],
                                },
                            },
                        },
                    ],
                }),
            )
        })

        it("should handle tool calls in response", async () => {
            mockOllamaInstance.chat.mockResolvedValue({
                message: {
                    content: "",
                    tool_calls: [
                        {
                            function: {
                                name: "get_lines",
                                arguments: { path: "test.ts", start: 1, end: 10 },
                            },
                        },
                    ],
                },
                eval_count: 5,
            })

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Read test.ts")]

            const response = await client.chat(messages)

            expect(response.toolCalls).toHaveLength(1)
            expect(response.toolCalls[0].name).toBe("get_lines")
            expect(response.toolCalls[0].params).toEqual({ path: "test.ts", start: 1, end: 10 })
            expect(response.stopReason).toBe("tool_use")
        })

        it("should handle multiple tool calls", async () => {
            mockOllamaInstance.chat.mockResolvedValue({
                message: {
                    content: "",
                    tool_calls: [
                        {
                            function: {
                                name: "get_lines",
                                arguments: { path: "a.ts" },
                            },
                        },
                        {
                            function: {
                                name: "get_lines",
                                arguments: { path: "b.ts" },
                            },
                        },
                    ],
                },
            })

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Read files")]

            const response = await client.chat(messages)

            expect(response.toolCalls).toHaveLength(2)
            expect(response.toolCalls[0].params).toEqual({ path: "a.ts" })
            expect(response.toolCalls[1].params).toEqual({ path: "b.ts" })
        })

        it("should estimate tokens when eval_count is not provided", async () => {
            mockOllamaInstance.chat.mockResolvedValue({
                message: {
                    content: "Short response",
                },
            })

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]

            const response = await client.chat(messages)

            expect(response.tokens).toBeGreaterThan(0)
        })

        it("should throw IpuaroError on chat failure", async () => {
            mockOllamaInstance.chat.mockRejectedValue(new Error("Connection failed"))

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]

            await expect(client.chat(messages)).rejects.toThrow(IpuaroError)
            await expect(client.chat(messages)).rejects.toMatchObject({
                type: "llm",
            })
        })

        it("should throw IpuaroError on AbortError", async () => {
            const abortError = new Error("Aborted")
            abortError.name = "AbortError"
            mockOllamaInstance.chat.mockRejectedValue(abortError)

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]

            await expect(client.chat(messages)).rejects.toThrow(IpuaroError)
            await expect(client.chat(messages)).rejects.toThrow("Generation was aborted")
        })

        it("should handle non-Error rejection", async () => {
            mockOllamaInstance.chat.mockRejectedValue("string error")

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]

            await expect(client.chat(messages)).rejects.toThrow("Unknown error")
        })

        it("should return timeMs in response", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]

            const response = await client.chat(messages)

            expect(response.timeMs).toBeGreaterThanOrEqual(0)
        })

        it("should handle tool with enum parameter", async () => {
            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]
            const tools: ToolDef[] = [
                {
                    name: "set_mode",
                    description: "Set mode",
                    parameters: [
                        {
                            name: "mode",
                            type: "string",
                            description: "Mode to set",
                            required: true,
                            enum: ["fast", "slow", "normal"],
                        },
                    ],
                },
            ]

            await client.chat(messages, tools)

            expect(mockOllamaInstance.chat).toHaveBeenCalledWith(
                expect.objectContaining({
                    tools: [
                        expect.objectContaining({
                            function: expect.objectContaining({
                                parameters: expect.objectContaining({
                                    properties: {
                                        mode: {
                                            type: "string",
                                            description: "Mode to set",
                                            enum: ["fast", "slow", "normal"],
                                        },
                                    },
                                }),
                            }),
                        }),
                    ],
                }),
            )
        })
    })

    describe("countTokens", () => {
        it("should estimate token count", async () => {
            const client = new OllamaClient(defaultConfig)
            const tokens = await client.countTokens("Hello world")

            expect(tokens).toBeGreaterThan(0)
        })

        it("should return higher count for longer text", async () => {
            const client = new OllamaClient(defaultConfig)
            const shortTokens = await client.countTokens("Hi")
            const longTokens = await client.countTokens("This is a much longer text for estimation")

            expect(longTokens).toBeGreaterThan(shortTokens)
        })
    })

    describe("isAvailable", () => {
        it("should return true when Ollama is available", async () => {
            const client = new OllamaClient(defaultConfig)
            const available = await client.isAvailable()

            expect(available).toBe(true)
            expect(mockOllamaInstance.list).toHaveBeenCalled()
        })

        it("should return false when Ollama is not available", async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error("Connection refused"))

            const client = new OllamaClient(defaultConfig)
            const available = await client.isAvailable()

            expect(available).toBe(false)
        })
    })

    describe("getModelName", () => {
        it("should return configured model name", () => {
            const client = new OllamaClient(defaultConfig)
            expect(client.getModelName()).toBe("qwen2.5-coder:7b-instruct")
        })

        it("should return custom model name", () => {
            const customConfig = { ...defaultConfig, model: "llama2:7b" }
            const client = new OllamaClient(customConfig)
            expect(client.getModelName()).toBe("llama2:7b")
        })
    })

    describe("getContextWindowSize", () => {
        it("should return configured context window", () => {
            const client = new OllamaClient(defaultConfig)
            expect(client.getContextWindowSize()).toBe(128_000)
        })

        it("should return custom context window", () => {
            const customConfig = { ...defaultConfig, contextWindow: 32_000 }
            const client = new OllamaClient(customConfig)
            expect(client.getContextWindowSize()).toBe(32_000)
        })
    })

    describe("pullModel", () => {
        it("should pull model successfully", async () => {
            const client = new OllamaClient(defaultConfig)
            await client.pullModel("llama2:7b")

            expect(mockOllamaInstance.pull).toHaveBeenCalledWith({
                model: "llama2:7b",
                stream: false,
            })
        })

        it("should throw IpuaroError on pull failure", async () => {
            mockOllamaInstance.pull.mockRejectedValue(new Error("Model not found"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.pullModel("invalid-model")).rejects.toThrow(IpuaroError)
            await expect(client.pullModel("invalid-model")).rejects.toMatchObject({
                type: "llm",
            })
        })
    })

    describe("abort", () => {
        it("should not throw when called without active generation", () => {
            const client = new OllamaClient(defaultConfig)
            expect(() => client.abort()).not.toThrow()
        })

        it("should abort active generation", async () => {
            let resolveChat: (() => void) | undefined
            mockOllamaInstance.chat.mockImplementation(() => {
                return new Promise((resolve) => {
                    resolveChat = () => resolve({
                        message: { content: "test" },
                        eval_count: 5,
                    })
                })
            })

            const client = new OllamaClient(defaultConfig)
            const messages: ChatMessage[] = [createMessage("user", "Hello")]

            const chatPromise = client.chat(messages)

            client.abort()

            if (resolveChat) {
                resolveChat()
            }
            const response = await chatPromise
            expect(response.content).toBe("test")
        })
    })

    describe("hasModel", () => {
        it("should return true when model exists", async () => {
            const client = new OllamaClient(defaultConfig)
            const hasModel = await client.hasModel("qwen2.5-coder:7b-instruct")

            expect(hasModel).toBe(true)
        })

        it("should return true for model prefix match", async () => {
            const client = new OllamaClient(defaultConfig)
            const hasModel = await client.hasModel("qwen2.5-coder")

            expect(hasModel).toBe(true)
        })

        it("should return false when model does not exist", async () => {
            const client = new OllamaClient(defaultConfig)
            const hasModel = await client.hasModel("nonexistent-model")

            expect(hasModel).toBe(false)
        })

        it("should return false on list failure", async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error("Connection failed"))

            const client = new OllamaClient(defaultConfig)
            const hasModel = await client.hasModel("llama2")

            expect(hasModel).toBe(false)
        })
    })

    describe("listModels", () => {
        it("should return list of model names", async () => {
            const client = new OllamaClient(defaultConfig)
            const models = await client.listModels()

            expect(models).toEqual(["qwen2.5-coder:7b-instruct", "llama2:latest"])
        })

        it("should throw IpuaroError on list failure", async () => {
            mockOllamaInstance.list.mockRejectedValue(new Error("Connection failed"))

            const client = new OllamaClient(defaultConfig)

            await expect(client.listModels()).rejects.toThrow(IpuaroError)
            await expect(client.listModels()).rejects.toMatchObject({
                type: "llm",
            })
        })
    })
})
