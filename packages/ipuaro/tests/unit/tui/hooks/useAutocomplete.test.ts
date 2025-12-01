/**
 * Unit tests for useAutocomplete hook.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useAutocomplete } from "../../../../src/tui/hooks/useAutocomplete.js"
import type { IStorage } from "../../../../src/domain/services/IStorage.js"
import type { FileData } from "../../../../src/domain/value-objects/FileData.js"

function createMockStorage(files: Map<string, FileData>): IStorage {
    return {
        getAllFiles: vi.fn().mockResolvedValue(files),
        getFile: vi.fn(),
        setFile: vi.fn(),
        deleteFile: vi.fn(),
        getFileCount: vi.fn(),
        getAST: vi.fn(),
        setAST: vi.fn(),
        deleteAST: vi.fn(),
        getAllASTs: vi.fn(),
        getMeta: vi.fn(),
        setMeta: vi.fn(),
        deleteMeta: vi.fn(),
        getAllMetas: vi.fn(),
        getSymbolIndex: vi.fn(),
        setSymbolIndex: vi.fn(),
        getDepsGraph: vi.fn(),
        setDepsGraph: vi.fn(),
        getProjectConfig: vi.fn(),
        setProjectConfig: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: vi.fn(),
        clear: vi.fn(),
    } as unknown as IStorage
}

function createFileData(content: string): FileData {
    return {
        lines: content.split("\n"),
        hash: "test-hash",
        size: content.length,
        lastModified: Date.now(),
    }
}

describe("useAutocomplete", () => {
    const projectRoot = "/test/project"

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("initialization", () => {
        it("should load file paths from storage", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
                ["/test/project/src/utils.ts", createFileData("test")],
                ["/test/project/README.md", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalledTimes(1)
            })

            expect(result.current.suggestions).toEqual([])
        })

        it("should not load paths when disabled", async () => {
            const files = new Map<string, FileData>()
            const storage = createMockStorage(files)

            renderHook(() => useAutocomplete({ storage, projectRoot, enabled: false }))

            await new Promise((resolve) => setTimeout(resolve, 50))
            expect(storage.getAllFiles).not.toHaveBeenCalled()
        })

        it("should handle storage errors gracefully", async () => {
            const storage = {
                ...createMockStorage(new Map()),
                getAllFiles: vi.fn().mockRejectedValue(new Error("Storage error")),
            } as unknown as IStorage

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            // Should not crash, suggestions should be empty
            expect(result.current.suggestions).toEqual([])
        })
    })

    describe("complete", () => {
        it("should return empty array for empty input", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("")
            })

            expect(suggestions).toEqual([])
        })

        it("should return exact prefix matches", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
                ["/test/project/src/utils.ts", createFileData("test")],
                ["/test/project/tests/index.test.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("src/")
            })

            expect(suggestions).toHaveLength(2)
            expect(suggestions).toContain("src/index.ts")
            expect(suggestions).toContain("src/utils.ts")
        })

        it("should support fuzzy matching", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/components/Button.tsx", createFileData("test")],
                ["/test/project/src/utils/helpers.ts", createFileData("test")],
                ["/test/project/tests/unit/button.test.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("btn")
            })

            // Should match "Button.tsx" and "button.test.ts" (fuzzy match)
            expect(suggestions.length).toBeGreaterThan(0)
            expect(suggestions.some((s) => s.includes("Button.tsx"))).toBe(true)
        })

        it("should respect maxSuggestions limit", async () => {
            const files = new Map<string, FileData>()
            for (let i = 0; i < 20; i++) {
                files.set(`/test/project/file${i}.ts`, createFileData("test"))
            }
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true, maxSuggestions: 5 }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("file")
            })

            expect(suggestions.length).toBeLessThanOrEqual(5)
        })

        it("should normalize paths with leading ./", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("./src/index")
            })

            expect(suggestions).toContain("src/index.ts")
        })

        it("should handle paths with trailing slash", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
                ["/test/project/src/utils.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("src/")
            })

            expect(suggestions.length).toBeGreaterThan(0)
        })

        it("should be case-insensitive", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/UserService.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("userservice")
            })

            expect(suggestions).toContain("src/UserService.ts")
        })

        it("should update suggestions state", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            expect(result.current.suggestions).toEqual([])

            act(() => {
                result.current.complete("src/")
            })

            expect(result.current.suggestions.length).toBeGreaterThan(0)
        })
    })

    describe("accept", () => {
        it("should return single suggestion when only one exists", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/unique-file.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            act(() => {
                result.current.complete("unique")
            })

            let accepted = ""
            act(() => {
                accepted = result.current.accept("unique")
            })

            expect(accepted).toBe("src/unique-file.ts")
            expect(result.current.suggestions).toEqual([])
        })

        it("should return common prefix for multiple suggestions", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/components/Button.tsx", createFileData("test")],
                ["/test/project/src/components/ButtonGroup.tsx", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            act(() => {
                result.current.complete("src/comp")
            })

            let accepted = ""
            act(() => {
                accepted = result.current.accept("src/comp")
            })

            // Common prefix is "src/components/Button"
            expect(accepted.startsWith("src/components/Button")).toBe(true)
        })

        it("should return input if no common prefix extension", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/foo.ts", createFileData("test")],
                ["/test/project/src/bar.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            act(() => {
                result.current.complete("src/")
            })

            let accepted = ""
            act(() => {
                accepted = result.current.accept("src/")
            })

            // Common prefix is just "src/" which is same as input
            expect(accepted).toBe("src/")
        })
    })

    describe("reset", () => {
        it("should clear suggestions", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            act(() => {
                result.current.complete("src/")
            })

            expect(result.current.suggestions.length).toBeGreaterThan(0)

            act(() => {
                result.current.reset()
            })

            expect(result.current.suggestions).toEqual([])
        })
    })

    describe("edge cases", () => {
        it("should handle empty file list", async () => {
            const files = new Map<string, FileData>()
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("anything")
            })

            expect(suggestions).toEqual([])
        })

        it("should handle whitespace-only input", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("   ")
            })

            expect(suggestions).toEqual([])
        })

        it("should handle paths with special characters", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/my-file.ts", createFileData("test")],
                ["/test/project/src/my_file.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("my-")
            })

            expect(suggestions).toContain("src/my-file.ts")
        })

        it("should return empty suggestions when disabled", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/src/index.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: false }),
            )

            // Give time for any potential async operations
            await new Promise((resolve) => setTimeout(resolve, 50))

            let suggestions: string[] = []
            act(() => {
                suggestions = result.current.complete("src/")
            })

            expect(suggestions).toEqual([])
        })

        it("should handle accept with no suggestions", async () => {
            const files = new Map<string, FileData>()
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            let accepted = ""
            act(() => {
                accepted = result.current.accept("test")
            })

            // Should return the input when there are no suggestions
            expect(accepted).toBe("test")
        })

        it("should handle common prefix calculation for single character paths", async () => {
            const files = new Map<string, FileData>([
                ["/test/project/a.ts", createFileData("test")],
                ["/test/project/b.ts", createFileData("test")],
            ])
            const storage = createMockStorage(files)

            const { result } = renderHook(() =>
                useAutocomplete({ storage, projectRoot, enabled: true }),
            )

            await waitFor(() => {
                expect(storage.getAllFiles).toHaveBeenCalled()
            })

            act(() => {
                result.current.complete("")
            })

            // This tests edge case in common prefix calculation
            const accepted = result.current.accept("")
            expect(typeof accepted).toBe("string")
        })
    })
})
