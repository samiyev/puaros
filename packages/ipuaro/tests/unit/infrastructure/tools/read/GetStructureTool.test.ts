import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { promises as fs } from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import {
    GetStructureTool,
    type GetStructureResult,
} from "../../../../../src/infrastructure/tools/read/GetStructureTool.js"
import type { ToolContext } from "../../../../../src/domain/services/ITool.js"
import type { IStorage } from "../../../../../src/domain/services/IStorage.js"

function createMockStorage(): IStorage {
    return {
        getFile: vi.fn(),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getAllFiles: vi.fn(),
        getAST: vi.fn(),
        setAST: vi.fn(),
        getMeta: vi.fn(),
        setMeta: vi.fn(),
        getSymbolIndex: vi.fn(),
        setSymbolIndex: vi.fn(),
        getDepsGraph: vi.fn(),
        setDepsGraph: vi.fn(),
        getConfig: vi.fn(),
        setConfig: vi.fn(),
        clear: vi.fn(),
    } as unknown as IStorage
}

function createMockContext(projectRoot: string): ToolContext {
    return {
        projectRoot,
        storage: createMockStorage(),
        requestConfirmation: vi.fn().mockResolvedValue(true),
        onProgress: vi.fn(),
    }
}

describe("GetStructureTool", () => {
    let tool: GetStructureTool
    let tempDir: string

    beforeEach(async () => {
        tool = new GetStructureTool()
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ipuaro-test-"))
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    describe("metadata", () => {
        it("should have correct name", () => {
            expect(tool.name).toBe("get_structure")
        })

        it("should have correct category", () => {
            expect(tool.category).toBe("read")
        })

        it("should not require confirmation", () => {
            expect(tool.requiresConfirmation).toBe(false)
        })

        it("should have correct parameters", () => {
            expect(tool.parameters).toHaveLength(2)
            expect(tool.parameters[0].name).toBe("path")
            expect(tool.parameters[0].required).toBe(false)
            expect(tool.parameters[1].name).toBe("depth")
            expect(tool.parameters[1].required).toBe(false)
        })
    })

    describe("validateParams", () => {
        it("should return null for empty params", () => {
            expect(tool.validateParams({})).toBeNull()
        })

        it("should return null for valid path", () => {
            expect(tool.validateParams({ path: "src" })).toBeNull()
        })

        it("should return null for valid depth", () => {
            expect(tool.validateParams({ depth: 3 })).toBeNull()
        })

        it("should return error for non-string path", () => {
            expect(tool.validateParams({ path: 123 })).toBe("Parameter 'path' must be a string")
        })

        it("should return error for non-integer depth", () => {
            expect(tool.validateParams({ depth: 2.5 })).toBe("Parameter 'depth' must be an integer")
        })

        it("should return error for depth < 1", () => {
            expect(tool.validateParams({ depth: 0 })).toBe("Parameter 'depth' must be >= 1")
        })
    })

    describe("execute", () => {
        it("should return tree structure for empty directory", async () => {
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.path).toBe(".")
            expect(data.tree.type).toBe("directory")
            expect(data.tree.children).toEqual([])
            expect(data.stats.directories).toBe(1)
            expect(data.stats.files).toBe(0)
        })

        it("should return tree structure with files", async () => {
            await fs.writeFile(path.join(tempDir, "file1.ts"), "")
            await fs.writeFile(path.join(tempDir, "file2.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.tree.children).toHaveLength(2)
            expect(data.stats.files).toBe(2)
            expect(data.content).toContain("file1.ts")
            expect(data.content).toContain("file2.ts")
        })

        it("should return nested directory structure", async () => {
            await fs.mkdir(path.join(tempDir, "src"))
            await fs.writeFile(path.join(tempDir, "src", "index.ts"), "")
            await fs.mkdir(path.join(tempDir, "src", "utils"))
            await fs.writeFile(path.join(tempDir, "src", "utils", "helper.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.stats.directories).toBe(3)
            expect(data.stats.files).toBe(2)
            expect(data.content).toContain("src")
            expect(data.content).toContain("index.ts")
            expect(data.content).toContain("utils")
            expect(data.content).toContain("helper.ts")
        })

        it("should respect depth parameter", async () => {
            await fs.mkdir(path.join(tempDir, "level1"))
            await fs.mkdir(path.join(tempDir, "level1", "level2"))
            await fs.mkdir(path.join(tempDir, "level1", "level2", "level3"))
            await fs.writeFile(path.join(tempDir, "level1", "level2", "level3", "deep.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({ depth: 2 }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.content).toContain("level1")
            expect(data.content).toContain("level2")
            expect(data.content).not.toContain("level3")
            expect(data.content).not.toContain("deep.ts")
        })

        it("should filter subdirectory when path specified", async () => {
            await fs.mkdir(path.join(tempDir, "src"))
            await fs.mkdir(path.join(tempDir, "tests"))
            await fs.writeFile(path.join(tempDir, "src", "index.ts"), "")
            await fs.writeFile(path.join(tempDir, "tests", "test.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({ path: "src" }, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.path).toBe("src")
            expect(data.content).toContain("index.ts")
            expect(data.content).not.toContain("test.ts")
        })

        it("should ignore node_modules", async () => {
            await fs.mkdir(path.join(tempDir, "node_modules"))
            await fs.writeFile(path.join(tempDir, "node_modules", "pkg.js"), "")
            await fs.writeFile(path.join(tempDir, "index.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.content).not.toContain("node_modules")
            expect(data.content).toContain("index.ts")
        })

        it("should ignore .git directory", async () => {
            await fs.mkdir(path.join(tempDir, ".git"))
            await fs.writeFile(path.join(tempDir, ".git", "config"), "")
            await fs.writeFile(path.join(tempDir, "index.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.content).not.toContain(".git")
        })

        it("should sort directories before files", async () => {
            await fs.writeFile(path.join(tempDir, "aaa.ts"), "")
            await fs.mkdir(path.join(tempDir, "zzz"))
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            const zzzIndex = data.content.indexOf("zzz")
            const aaaIndex = data.content.indexOf("aaa.ts")
            expect(zzzIndex).toBeLessThan(aaaIndex)
        })

        it("should return error for path outside project root", async () => {
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({ path: "../outside" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toBe("Path contains traversal patterns")
        })

        it("should return error for non-directory path", async () => {
            await fs.writeFile(path.join(tempDir, "file.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({ path: "file.ts" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("is not a directory")
        })

        it("should return error for non-existent path", async () => {
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({ path: "nonexistent" }, ctx)

            expect(result.success).toBe(false)
            expect(result.error).toContain("ENOENT")
        })

        it("should include callId in result", async () => {
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.callId).toMatch(/^get_structure-\d+$/)
        })

        it("should use tree icons in output", async () => {
            await fs.mkdir(path.join(tempDir, "src"))
            await fs.writeFile(path.join(tempDir, "index.ts"), "")
            const ctx = createMockContext(tempDir)

            const result = await tool.execute({}, ctx)

            expect(result.success).toBe(true)
            const data = result.data as GetStructureResult
            expect(data.content).toContain("📁")
            expect(data.content).toContain("📄")
        })
    })
})
