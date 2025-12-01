import { describe, it, expect, vi, beforeEach } from "vitest"
import {
    RunCommandTool,
    type RunCommandResult,
} from "../../../../../src/infrastructure/tools/run/RunCommandTool.js"
import { CommandSecurity } from "../../../../../src/infrastructure/tools/run/CommandSecurity.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"

function createMockStorage(): IStorage {
    return {
        getFile: vi.fn(),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn().mockResolvedValue(new Map()),
        getFileCount: vi.fn().mockResolvedValue(0),
        getAST: vi.fn(),
        setAST: vi.fn(),
        deleteAST: vi.fn(),
        getAllASTs: vi.fn().mockResolvedValue(new Map()),
        getMeta: vi.fn(),
        setMeta: vi.fn(),
        deleteMeta: vi.fn(),
        getAllMetas: vi.fn().mockResolvedValue(new Map()),
        getSymbolIndex: vi.fn().mockResolvedValue(new Map()),
        setSymbolIndex: vi.fn(),
        getDepsGraph: vi.fn().mockResolvedValue({ imports: new Map(), importedBy: new Map() }),
        setDepsGraph: vi.fn(),
        getProjectConfig: vi.fn(),
        setProjectConfig: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: vi.fn().mockReturnValue(true),
        clear: vi.fn(),
    } as unknown as IStorage
}

function createMockContext(storage?: IStorage, confirmResult: boolean = true): ToolContext {
    return {
        projectRoot: "/test/project",
        storage: storage ?? createMockStorage(),
        requestConfirmation: vi.fn().mockResolvedValue(confirmResult),
        onProgress: vi.fn(),
    }
}

type ExecResult = { stdout: string; stderr: string }
type ExecFn = (command: string, options: Record<string, unknown>) => Promise<ExecResult>

function createMockExec(options: {
    stdout?: string
    stderr?: string
    error?: Error & { code?: number; stdout?: string; stderr?: string }
}): ExecFn {
    return vi.fn().mockImplementation(() => {
        if (options.error) {
            return Promise.reject(options.error)
        }
        return Promise.resolve({
            stdout: options.stdout ?? "",
            stderr: options.stderr ?? "",
        })
    })
}

describe("RunCommandTool", () => {
    let tool: RunCommandTool

    beforeEach(() => {
        tool = new RunCommandTool()
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("run_command")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("run")
        })

        it("should not require confirmation (handled internally)", () => {
            expect(tool.requiresConfirmation).toBe(false)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(2)
            expect(tool.parameters[0].name).toBe("command")
            expect(tool.parameters[0].required).toBe(true)
            expect(tool.parameters[1].name).toBe("timeout")
            expect(tool.parameters[1].required).toBe(false)
        })

        it("should have description", () => {
            expect(tool.description).toContain("shell command")
            expect(tool.description).toContain("security")
        })
    })

    describe("validateParams", () => {
        it("should return error for missing command", () => {
            expect(tool.validateParams({})).toContain("command")
            expect(tool.validateParams({})).toContain("required")
        })

        it("should return error for non-string command", () => {
            expect(tool.validateParams({ command: 123 })).toContain("string")
        })

        it("should return error for empty command", () => {
            expect(tool.validateParams({ command: "" })).toContain("empty")
            expect(tool.validateParams({ command: "   " })).toContain("empty")
        })

        it("should return null for valid command", () => {
            expect(tool.validateParams({ command: "ls" })).toBeNull()
        })

        it("should return error for non-number timeout", () => {
            expect(tool.validateParams({ command: "ls", timeout: "5000" })).toContain("number")
        })

        it("should return error for negative timeout", () => {
            expect(tool.validateParams({ command: "ls", timeout: -1 })).toContain("positive")
        })

        it("should return error for zero timeout", () => {
            expect(tool.validateParams({ command: "ls", timeout: 0 })).toContain("positive")
        })

        it("should return error for timeout > 10 minutes", () => {
            expect(tool.validateParams({ command: "ls", timeout: 600001 })).toContain("600000")
        })

        it("should return null for valid timeout", () => {
            expect(tool.validateParams({ command: "ls", timeout: 5000 })).toBeNull()
        })
    })

    describe("execute - blocked commands", () => {
        it("should block dangerous commands", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "rm -rf /" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("blocked")
            expect(execFn).not.toHaveBeenCalled()
        })

        it("should block sudo commands", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "sudo apt-get" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("blocked")
        })

        it("should block git push --force", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "git push --force" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("blocked")
        })
    })

    describe("execute - allowed commands", () => {
        it("should execute whitelisted commands without confirmation", async () => {
            const execFn = createMockExec({ stdout: "output" })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "npm install" }, ctx)

            expect(result.success).toBe(true)
            expect(ctx.requestConfirmation).not.toHaveBeenCalled()
            expect(execFn).toHaveBeenCalled()
        })

        it("should return stdout and stderr", async () => {
            const execFn = createMockExec({
                stdout: "standard output",
                stderr: "standard error",
            })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "npm run build" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.stdout).toBe("standard output")
            expect(data.stderr).toBe("standard error")
            expect(data.exitCode).toBe(0)
            expect(data.success).toBe(true)
        })

        it("should mark requiredConfirmation as false", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.requiredConfirmation).toBe(false)
        })
    })

    describe("execute - requires confirmation", () => {
        it("should request confirmation for unknown commands", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "unknown-command" }, ctx)

            expect(ctx.requestConfirmation).toHaveBeenCalled()
        })

        it("should execute after confirmation", async () => {
            const execFn = createMockExec({ stdout: "done" })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext(undefined, true)

            const result = await toolWithMock.execute({ command: "custom-script" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.requiredConfirmation).toBe(true)
            expect(execFn).toHaveBeenCalled()
        })

        it("should cancel when user declines", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext(undefined, false)

            const result = await toolWithMock.execute({ command: "custom-script" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("cancelled")
            expect(execFn).not.toHaveBeenCalled()
        })

        it("should require confirmation for git commit", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "git commit -m 'test'" }, ctx)

            expect(ctx.requestConfirmation).toHaveBeenCalled()
        })
    })

    describe("execute - error handling", () => {
        it("should handle command failure with exit code", async () => {
            const error = Object.assign(new Error("Command failed"), {
                code: 1,
                stdout: "partial output",
                stderr: "error message",
            })
            const execFn = createMockExec({ error })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "npm test" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.success).toBe(false)
            expect(data.exitCode).toBe(1)
            expect(data.stdout).toBe("partial output")
            expect(data.stderr).toBe("error message")
        })

        it("should handle timeout", async () => {
            const error = new Error("Command timed out")
            const execFn = createMockExec({ error })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("timed out")
        })

        it("should handle ETIMEDOUT", async () => {
            const error = new Error("ETIMEDOUT")
            const execFn = createMockExec({ error })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("timed out")
        })

        it("should handle generic errors", async () => {
            const error = new Error("Something went wrong")
            const execFn = createMockExec({ error })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Something went wrong")
        })

        it("should handle non-Error exceptions", async () => {
            const execFn = vi.fn().mockRejectedValue("string error")
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("string error")
        })
    })

    describe("execute - options", () => {
        it("should use default timeout", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "ls" }, ctx)

            expect(execFn).toHaveBeenCalledWith("ls", expect.objectContaining({ timeout: 30000 }))
        })

        it("should use custom timeout", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "ls", timeout: 5000 }, ctx)

            expect(execFn).toHaveBeenCalledWith("ls", expect.objectContaining({ timeout: 5000 }))
        })

        it("should use config timeout", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn, { timeout: 45000 })
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "ls" }, ctx)

            expect(execFn).toHaveBeenCalledWith("ls", expect.objectContaining({ timeout: 45000 }))
        })

        it("should use null config timeout as default", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn, { timeout: null })
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "ls" }, ctx)

            expect(execFn).toHaveBeenCalledWith("ls", expect.objectContaining({ timeout: 30000 }))
        })

        it("should prefer param timeout over config timeout", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn, { timeout: 45000 })
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "ls", timeout: 5000 }, ctx)

            expect(execFn).toHaveBeenCalledWith("ls", expect.objectContaining({ timeout: 5000 }))
        })

        it("should execute in project root", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()
            ctx.projectRoot = "/my/project"

            await toolWithMock.execute({ command: "ls" }, ctx)

            expect(execFn).toHaveBeenCalledWith(
                "ls",
                expect.objectContaining({ cwd: "/my/project" }),
            )
        })

        it("should disable colors", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            await toolWithMock.execute({ command: "ls" }, ctx)

            expect(execFn).toHaveBeenCalledWith(
                "ls",
                expect.objectContaining({
                    env: expect.objectContaining({ FORCE_COLOR: "0" }),
                }),
            )
        })
    })

    describe("execute - output truncation", () => {
        it("should truncate very long output", async () => {
            const longOutput = "x".repeat(200000)
            const execFn = createMockExec({ stdout: longOutput })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.stdout.length).toBeLessThan(longOutput.length)
            expect(data.stdout).toContain("truncated")
        })

        it("should not truncate normal output", async () => {
            const normalOutput = "normal output"
            const execFn = createMockExec({ stdout: normalOutput })
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.stdout).toBe(normalOutput)
        })
    })

    describe("execute - timing", () => {
        it("should return execution time", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as RunCommandResult
            expect(data.durationMs).toBeGreaterThanOrEqual(0)
        })

        it("should return execution time ms in result", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.executionTimeMs).toBeGreaterThanOrEqual(0)
        })
    })

    describe("execute - call id", () => {
        it("should generate unique call id", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            const result = await toolWithMock.execute({ command: "ls" }, ctx)

            expect(result.callId).toMatch(/^run_command-\d+$/)
        })
    })

    describe("getSecurity", () => {
        it("should return security instance", () => {
            const security = new CommandSecurity()
            const toolWithSecurity = new RunCommandTool(security)

            expect(toolWithSecurity.getSecurity()).toBe(security)
        })

        it("should allow modifying security", async () => {
            const execFn = createMockExec({})
            const toolWithMock = new RunCommandTool(undefined, execFn)
            const ctx = createMockContext()

            toolWithMock.getSecurity().addToWhitelist(["custom-safe"])

            const result = await toolWithMock.execute({ command: "custom-safe arg" }, ctx)

            expect(result.success).toBe(true)
            expect(ctx.requestConfirmation).not.toHaveBeenCalled()
        })
    })
})
