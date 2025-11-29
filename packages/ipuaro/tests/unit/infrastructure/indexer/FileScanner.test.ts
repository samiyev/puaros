import * as fs from "node:fs/promises"
import * as path from "node:path"
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import {
    FileScanner,
    type ScanProgress,
} from "../../../../src/infrastructure/indexer/FileScanner.js"
import type { ScanResult } from "../../../../src/domain/services/IIndexer.js"

const FIXTURES_DIR = path.join(__dirname, "../../../fixtures/sample-project")

describe("FileScanner", () => {
    describe("constructor", () => {
        it("should create instance with default options", () => {
            const scanner = new FileScanner()
            expect(scanner).toBeInstanceOf(FileScanner)
        })

        it("should accept custom extensions", () => {
            const scanner = new FileScanner({ extensions: [".ts", ".js"] })
            expect(scanner.isSupportedExtension("file.ts")).toBe(true)
            expect(scanner.isSupportedExtension("file.js")).toBe(true)
            expect(scanner.isSupportedExtension("file.tsx")).toBe(false)
        })

        it("should accept additional ignore patterns", () => {
            const scanner = new FileScanner({ additionalIgnore: ["*.test.ts"] })
            expect(scanner).toBeInstanceOf(FileScanner)
        })

        it("should accept progress callback", () => {
            const onProgress = (progress: ScanProgress): void => {
                // callback
            }
            const scanner = new FileScanner({ onProgress })
            expect(scanner).toBeInstanceOf(FileScanner)
        })
    })

    describe("isSupportedExtension", () => {
        it("should return true for supported extensions", () => {
            const scanner = new FileScanner()
            expect(scanner.isSupportedExtension("file.ts")).toBe(true)
            expect(scanner.isSupportedExtension("file.tsx")).toBe(true)
            expect(scanner.isSupportedExtension("file.js")).toBe(true)
            expect(scanner.isSupportedExtension("file.jsx")).toBe(true)
            expect(scanner.isSupportedExtension("file.json")).toBe(true)
            expect(scanner.isSupportedExtension("file.yaml")).toBe(true)
            expect(scanner.isSupportedExtension("file.yml")).toBe(true)
        })

        it("should return false for unsupported extensions", () => {
            const scanner = new FileScanner()
            expect(scanner.isSupportedExtension("file.md")).toBe(false)
            expect(scanner.isSupportedExtension("file.txt")).toBe(false)
            expect(scanner.isSupportedExtension("file.png")).toBe(false)
        })

        it("should be case-insensitive", () => {
            const scanner = new FileScanner()
            expect(scanner.isSupportedExtension("file.TS")).toBe(true)
            expect(scanner.isSupportedExtension("file.TSX")).toBe(true)
        })
    })

    describe("scan", () => {
        it("should scan directory and yield file results", async () => {
            const scanner = new FileScanner()
            const results: ScanResult[] = []

            for await (const result of scanner.scan(FIXTURES_DIR)) {
                results.push(result)
            }

            expect(results.length).toBeGreaterThan(0)
            expect(results.every((r) => r.type === "file")).toBe(true)
        })

        it("should return relative paths", async () => {
            const scanner = new FileScanner()
            const results = await scanner.scanAll(FIXTURES_DIR)

            for (const result of results) {
                expect(path.isAbsolute(result.path)).toBe(false)
            }
        })

        it("should include file stats", async () => {
            const scanner = new FileScanner()
            const results = await scanner.scanAll(FIXTURES_DIR)

            for (const result of results) {
                expect(typeof result.size).toBe("number")
                expect(result.size).toBeGreaterThanOrEqual(0)
                expect(typeof result.lastModified).toBe("number")
                expect(result.lastModified).toBeGreaterThan(0)
            }
        })

        it("should ignore node_modules by default", async () => {
            const scanner = new FileScanner()
            const results = await scanner.scanAll(FIXTURES_DIR)

            const nodeModulesFiles = results.filter((r) => r.path.includes("node_modules"))
            expect(nodeModulesFiles).toHaveLength(0)
        })

        it("should respect .gitignore", async () => {
            const scanner = new FileScanner()
            const results = await scanner.scanAll(FIXTURES_DIR)

            const ignoredFile = results.find((r) => r.path.includes("ignored-file"))
            expect(ignoredFile).toBeUndefined()
        })

        it("should only include supported extensions", async () => {
            const scanner = new FileScanner({ extensions: [".ts"] })
            const results = await scanner.scanAll(FIXTURES_DIR)

            for (const result of results) {
                expect(result.path.endsWith(".ts")).toBe(true)
            }
        })

        it("should call progress callback", async () => {
            const progressCalls: ScanProgress[] = []
            const scanner = new FileScanner({
                onProgress: (progress) => {
                    progressCalls.push({ ...progress })
                },
            })

            await scanner.scanAll(FIXTURES_DIR)

            expect(progressCalls.length).toBeGreaterThan(0)
            for (const progress of progressCalls) {
                expect(progress.current).toBeGreaterThan(0)
                expect(progress.total).toBeGreaterThan(0)
                expect(typeof progress.currentFile).toBe("string")
            }
        })
    })

    describe("scanAll", () => {
        it("should return array of all results", async () => {
            const scanner = new FileScanner()
            const results = await scanner.scanAll(FIXTURES_DIR)

            expect(Array.isArray(results)).toBe(true)
            expect(results.length).toBeGreaterThan(0)
        })
    })

    describe("isTextFile", () => {
        let textFilePath: string
        let binaryFilePath: string

        beforeAll(async () => {
            textFilePath = path.join(FIXTURES_DIR, "src", "index.ts")
            binaryFilePath = path.join(FIXTURES_DIR, "binary-test.bin")
            await fs.writeFile(binaryFilePath, Buffer.from([0x00, 0x01, 0x02]))
        })

        afterAll(async () => {
            try {
                await fs.unlink(binaryFilePath)
            } catch {
                // ignore
            }
        })

        it("should return true for text files", async () => {
            const isText = await FileScanner.isTextFile(textFilePath)
            expect(isText).toBe(true)
        })

        it("should return false for binary files", async () => {
            const isText = await FileScanner.isTextFile(binaryFilePath)
            expect(isText).toBe(false)
        })

        it("should return false for non-existent files", async () => {
            const isText = await FileScanner.isTextFile("/non/existent/file.ts")
            expect(isText).toBe(false)
        })
    })

    describe("readFileContent", () => {
        it("should read text file content", async () => {
            const filePath = path.join(FIXTURES_DIR, "src", "index.ts")
            const content = await FileScanner.readFileContent(filePath)

            expect(content).not.toBeNull()
            expect(content).toContain("export function main")
        })

        it("should return null for binary files", async () => {
            const binaryFilePath = path.join(FIXTURES_DIR, "binary-test2.bin")
            await fs.writeFile(binaryFilePath, Buffer.from([0x00, 0x01, 0x02]))

            try {
                const content = await FileScanner.readFileContent(binaryFilePath)
                expect(content).toBeNull()
            } finally {
                await fs.unlink(binaryFilePath)
            }
        })

        it("should return null for non-existent files", async () => {
            const content = await FileScanner.readFileContent("/non/existent/file.ts")
            expect(content).toBeNull()
        })
    })

    describe("empty directory handling", () => {
        let emptyDir: string

        beforeAll(async () => {
            emptyDir = path.join(FIXTURES_DIR, "empty-dir")
            await fs.mkdir(emptyDir, { recursive: true })
        })

        afterAll(async () => {
            try {
                await fs.rmdir(emptyDir)
            } catch {
                // ignore
            }
        })

        it("should handle empty directories gracefully", async () => {
            const scanner = new FileScanner()
            const results = await scanner.scanAll(emptyDir)

            expect(results).toHaveLength(0)
        })
    })
})
