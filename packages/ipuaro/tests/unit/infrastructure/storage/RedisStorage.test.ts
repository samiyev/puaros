import { describe, it, expect, vi, beforeEach } from "vitest"
import { RedisStorage } from "../../../../src/infrastructure/storage/RedisStorage.js"
import { RedisClient } from "../../../../src/infrastructure/storage/RedisClient.js"
import type { FileData } from "../../../../src/domain/value-objects/FileData.js"
import type { FileAST } from "../../../../src/domain/value-objects/FileAST.js"
import type { FileMeta } from "../../../../src/domain/value-objects/FileMeta.js"
import type { SymbolIndex, DepsGraph } from "../../../../src/domain/services/IStorage.js"
import { IpuaroError } from "../../../../src/shared/errors/IpuaroError.js"

describe("RedisStorage", () => {
    const projectName = "test-project"
    let mockRedis: {
        hget: ReturnType<typeof vi.fn>
        hset: ReturnType<typeof vi.fn>
        hdel: ReturnType<typeof vi.fn>
        hgetall: ReturnType<typeof vi.fn>
        hlen: ReturnType<typeof vi.fn>
        del: ReturnType<typeof vi.fn>
    }
    let mockClient: {
        connect: ReturnType<typeof vi.fn>
        disconnect: ReturnType<typeof vi.fn>
        isConnected: ReturnType<typeof vi.fn>
        getClient: ReturnType<typeof vi.fn>
    }
    let storage: RedisStorage

    beforeEach(() => {
        mockRedis = {
            hget: vi.fn(),
            hset: vi.fn(),
            hdel: vi.fn(),
            hgetall: vi.fn(),
            hlen: vi.fn(),
            del: vi.fn(),
        }

        mockClient = {
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            isConnected: vi.fn().mockReturnValue(true),
            getClient: vi.fn().mockReturnValue(mockRedis),
        }

        storage = new RedisStorage(mockClient as unknown as RedisClient, projectName)
    })

    describe("File operations", () => {
        const testFile: FileData = {
            lines: ["line1", "line2"],
            hash: "abc123",
            size: 100,
            lastModified: Date.now(),
        }

        describe("getFile", () => {
            it("should return file data when exists", async () => {
                mockRedis.hget.mockResolvedValue(JSON.stringify(testFile))

                const result = await storage.getFile("src/index.ts")

                expect(result).toEqual(testFile)
                expect(mockRedis.hget).toHaveBeenCalledWith(
                    `project:${projectName}:files`,
                    "src/index.ts",
                )
            })

            it("should return null when file not found", async () => {
                mockRedis.hget.mockResolvedValue(null)

                const result = await storage.getFile("nonexistent.ts")

                expect(result).toBeNull()
            })

            it("should throw on invalid JSON", async () => {
                mockRedis.hget.mockResolvedValue("invalid json")

                await expect(storage.getFile("test.ts")).rejects.toThrow(IpuaroError)
            })
        })

        describe("setFile", () => {
            it("should store file data", async () => {
                await storage.setFile("src/index.ts", testFile)

                expect(mockRedis.hset).toHaveBeenCalledWith(
                    `project:${projectName}:files`,
                    "src/index.ts",
                    JSON.stringify(testFile),
                )
            })
        })

        describe("deleteFile", () => {
            it("should delete file data", async () => {
                await storage.deleteFile("src/index.ts")

                expect(mockRedis.hdel).toHaveBeenCalledWith(
                    `project:${projectName}:files`,
                    "src/index.ts",
                )
            })
        })

        describe("getAllFiles", () => {
            it("should return all files as Map", async () => {
                mockRedis.hgetall.mockResolvedValue({
                    "src/a.ts": JSON.stringify(testFile),
                    "src/b.ts": JSON.stringify({ ...testFile, hash: "def456" }),
                })

                const result = await storage.getAllFiles()

                expect(result).toBeInstanceOf(Map)
                expect(result.size).toBe(2)
                expect(result.get("src/a.ts")).toEqual(testFile)
            })

            it("should return empty Map when no files", async () => {
                mockRedis.hgetall.mockResolvedValue({})

                const result = await storage.getAllFiles()

                expect(result.size).toBe(0)
            })
        })

        describe("getFileCount", () => {
            it("should return file count", async () => {
                mockRedis.hlen.mockResolvedValue(42)

                const result = await storage.getFileCount()

                expect(result).toBe(42)
            })
        })
    })

    describe("AST operations", () => {
        const testAST: FileAST = {
            imports: [],
            exports: [],
            functions: [],
            classes: [],
            interfaces: [],
            typeAliases: [],
            parseError: false,
        }

        describe("getAST", () => {
            it("should return AST when exists", async () => {
                mockRedis.hget.mockResolvedValue(JSON.stringify(testAST))

                const result = await storage.getAST("src/index.ts")

                expect(result).toEqual(testAST)
            })

            it("should return null when not found", async () => {
                mockRedis.hget.mockResolvedValue(null)

                const result = await storage.getAST("nonexistent.ts")

                expect(result).toBeNull()
            })
        })

        describe("setAST", () => {
            it("should store AST", async () => {
                await storage.setAST("src/index.ts", testAST)

                expect(mockRedis.hset).toHaveBeenCalledWith(
                    `project:${projectName}:ast`,
                    "src/index.ts",
                    JSON.stringify(testAST),
                )
            })
        })

        describe("deleteAST", () => {
            it("should delete AST", async () => {
                await storage.deleteAST("src/index.ts")

                expect(mockRedis.hdel).toHaveBeenCalledWith(
                    `project:${projectName}:ast`,
                    "src/index.ts",
                )
            })
        })

        describe("getAllASTs", () => {
            it("should return all ASTs as Map", async () => {
                mockRedis.hgetall.mockResolvedValue({
                    "src/a.ts": JSON.stringify(testAST),
                })

                const result = await storage.getAllASTs()

                expect(result).toBeInstanceOf(Map)
                expect(result.size).toBe(1)
            })
        })
    })

    describe("Meta operations", () => {
        const testMeta: FileMeta = {
            complexity: { loc: 10, nesting: 2, cyclomaticComplexity: 5, score: 20 },
            dependencies: ["./other.ts"],
            dependents: [],
            isHub: false,
            isEntryPoint: false,
            fileType: "source",
        }

        describe("getMeta", () => {
            it("should return meta when exists", async () => {
                mockRedis.hget.mockResolvedValue(JSON.stringify(testMeta))

                const result = await storage.getMeta("src/index.ts")

                expect(result).toEqual(testMeta)
            })

            it("should return null when not found", async () => {
                mockRedis.hget.mockResolvedValue(null)

                const result = await storage.getMeta("nonexistent.ts")

                expect(result).toBeNull()
            })
        })

        describe("setMeta", () => {
            it("should store meta", async () => {
                await storage.setMeta("src/index.ts", testMeta)

                expect(mockRedis.hset).toHaveBeenCalledWith(
                    `project:${projectName}:meta`,
                    "src/index.ts",
                    JSON.stringify(testMeta),
                )
            })
        })

        describe("deleteMeta", () => {
            it("should delete meta", async () => {
                await storage.deleteMeta("src/index.ts")

                expect(mockRedis.hdel).toHaveBeenCalledWith(
                    `project:${projectName}:meta`,
                    "src/index.ts",
                )
            })
        })

        describe("getAllMetas", () => {
            it("should return all metas as Map", async () => {
                mockRedis.hgetall.mockResolvedValue({
                    "src/a.ts": JSON.stringify(testMeta),
                })

                const result = await storage.getAllMetas()

                expect(result).toBeInstanceOf(Map)
                expect(result.size).toBe(1)
            })
        })
    })

    describe("Index operations", () => {
        describe("getSymbolIndex", () => {
            it("should return symbol index", async () => {
                const index: [string, { path: string; line: number; type: string }[]][] = [
                    ["MyClass", [{ path: "src/index.ts", line: 10, type: "class" }]],
                ]
                mockRedis.hget.mockResolvedValue(JSON.stringify(index))

                const result = await storage.getSymbolIndex()

                expect(result).toBeInstanceOf(Map)
                expect(result.get("MyClass")).toBeDefined()
            })

            it("should return empty Map when not found", async () => {
                mockRedis.hget.mockResolvedValue(null)

                const result = await storage.getSymbolIndex()

                expect(result.size).toBe(0)
            })
        })

        describe("setSymbolIndex", () => {
            it("should store symbol index", async () => {
                const index: SymbolIndex = new Map([
                    ["MyClass", [{ path: "src/index.ts", line: 10, type: "class" }]],
                ])

                await storage.setSymbolIndex(index)

                expect(mockRedis.hset).toHaveBeenCalledWith(
                    `project:${projectName}:indexes`,
                    "symbols",
                    expect.any(String),
                )
            })
        })

        describe("getDepsGraph", () => {
            it("should return deps graph", async () => {
                const graph = {
                    imports: [["a.ts", ["b.ts"]]],
                    importedBy: [["b.ts", ["a.ts"]]],
                }
                mockRedis.hget.mockResolvedValue(JSON.stringify(graph))

                const result = await storage.getDepsGraph()

                expect(result.imports).toBeInstanceOf(Map)
                expect(result.importedBy).toBeInstanceOf(Map)
            })

            it("should return empty graph when not found", async () => {
                mockRedis.hget.mockResolvedValue(null)

                const result = await storage.getDepsGraph()

                expect(result.imports.size).toBe(0)
                expect(result.importedBy.size).toBe(0)
            })
        })

        describe("setDepsGraph", () => {
            it("should store deps graph", async () => {
                const graph: DepsGraph = {
                    imports: new Map([["a.ts", ["b.ts"]]]),
                    importedBy: new Map([["b.ts", ["a.ts"]]]),
                }

                await storage.setDepsGraph(graph)

                expect(mockRedis.hset).toHaveBeenCalledWith(
                    `project:${projectName}:indexes`,
                    "deps_graph",
                    expect.any(String),
                )
            })
        })
    })

    describe("Config operations", () => {
        describe("getProjectConfig", () => {
            it("should return config value", async () => {
                mockRedis.hget.mockResolvedValue(JSON.stringify({ key: "value" }))

                const result = await storage.getProjectConfig("settings")

                expect(result).toEqual({ key: "value" })
            })

            it("should return null when not found", async () => {
                mockRedis.hget.mockResolvedValue(null)

                const result = await storage.getProjectConfig("nonexistent")

                expect(result).toBeNull()
            })
        })

        describe("setProjectConfig", () => {
            it("should store config value", async () => {
                await storage.setProjectConfig("settings", { key: "value" })

                expect(mockRedis.hset).toHaveBeenCalledWith(
                    `project:${projectName}:config`,
                    "settings",
                    JSON.stringify({ key: "value" }),
                )
            })
        })
    })

    describe("Lifecycle operations", () => {
        describe("connect", () => {
            it("should delegate to client", async () => {
                await storage.connect()

                expect(mockClient.connect).toHaveBeenCalled()
            })
        })

        describe("disconnect", () => {
            it("should delegate to client", async () => {
                await storage.disconnect()

                expect(mockClient.disconnect).toHaveBeenCalled()
            })
        })

        describe("isConnected", () => {
            it("should delegate to client", () => {
                mockClient.isConnected.mockReturnValue(true)

                expect(storage.isConnected()).toBe(true)
            })
        })

        describe("clear", () => {
            it("should delete all project keys", async () => {
                mockRedis.del.mockResolvedValue(1)

                await storage.clear()

                expect(mockRedis.del).toHaveBeenCalledTimes(5)
                expect(mockRedis.del).toHaveBeenCalledWith(`project:${projectName}:files`)
                expect(mockRedis.del).toHaveBeenCalledWith(`project:${projectName}:ast`)
                expect(mockRedis.del).toHaveBeenCalledWith(`project:${projectName}:meta`)
                expect(mockRedis.del).toHaveBeenCalledWith(`project:${projectName}:indexes`)
                expect(mockRedis.del).toHaveBeenCalledWith(`project:${projectName}:config`)
            })
        })
    })
})
