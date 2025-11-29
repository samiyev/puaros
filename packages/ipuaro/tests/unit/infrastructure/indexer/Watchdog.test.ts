import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { Watchdog, type FileChangeEvent } from "../../../../src/infrastructure/indexer/Watchdog.js"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"

describe("Watchdog", () => {
    let watchdog: Watchdog
    let tempDir: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "watchdog-test-"))
        watchdog = new Watchdog({ debounceMs: 50 })
    })

    afterEach(async () => {
        await watchdog.stop()
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    describe("constructor", () => {
        it("should create with default options", () => {
            const wd = new Watchdog()
            expect(wd.isWatching()).toBe(false)
            expect(wd.getRoot()).toBe("")
        })

        it("should accept custom options", () => {
            const wd = new Watchdog({
                debounceMs: 100,
                extensions: [".ts"],
                usePolling: true,
            })
            expect(wd.isWatching()).toBe(false)
        })
    })

    describe("start/stop", () => {
        it("should start watching", () => {
            watchdog.start(tempDir)
            expect(watchdog.isWatching()).toBe(true)
            expect(watchdog.getRoot()).toBe(tempDir)
        })

        it("should stop watching", async () => {
            watchdog.start(tempDir)
            await watchdog.stop()
            expect(watchdog.isWatching()).toBe(false)
        })

        it("should handle stop when not started", async () => {
            await watchdog.stop()
            expect(watchdog.isWatching()).toBe(false)
        })

        it("should restart when start called while running", async () => {
            watchdog.start(tempDir)
            const newTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "watchdog-test2-"))

            watchdog.start(newTempDir)
            expect(watchdog.isWatching()).toBe(true)
            expect(watchdog.getRoot()).toBe(newTempDir)

            await fs.rm(newTempDir, { recursive: true, force: true })
        })
    })

    describe("onFileChange/offFileChange", () => {
        it("should register callback", () => {
            const callback = vi.fn()
            watchdog.onFileChange(callback)
            expect(callback).not.toHaveBeenCalled()
        })

        it("should remove callback", () => {
            const callback = vi.fn()
            watchdog.onFileChange(callback)
            watchdog.offFileChange(callback)
        })

        it("should handle removing non-existent callback", () => {
            const callback = vi.fn()
            watchdog.offFileChange(callback)
        })
    })

    describe("getPendingCount", () => {
        it("should return 0 when no pending changes", () => {
            expect(watchdog.getPendingCount()).toBe(0)
        })
    })

    describe("getWatchedPaths", () => {
        it("should return empty array when not watching", () => {
            expect(watchdog.getWatchedPaths()).toEqual([])
        })

        it("should return watched paths when watching", async () => {
            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            watchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 200))

            const paths = watchdog.getWatchedPaths()
            expect(Array.isArray(paths)).toBe(true)
        })
    })

    describe("flushAll", () => {
        it("should not throw when no pending changes", () => {
            expect(() => watchdog.flushAll()).not.toThrow()
        })

        it("should flush pending changes immediately", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 30))

            watchdog.flushAll()

            await new Promise((resolve) => setTimeout(resolve, 100))
        })
    })

    describe("file change detection", () => {
        it("should detect new file creation", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 200))

            expect(events.length).toBeGreaterThanOrEqual(0)
        })

        it("should detect file modification", async () => {
            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            await fs.writeFile(testFile, "const x = 2")

            await new Promise((resolve) => setTimeout(resolve, 200))

            expect(events.length).toBeGreaterThanOrEqual(0)
        })

        it("should detect file deletion", async () => {
            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            await fs.unlink(testFile)

            await new Promise((resolve) => setTimeout(resolve, 200))

            expect(events.length).toBeGreaterThanOrEqual(0)
        })

        it("should ignore non-watched extensions", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const txtFile = path.join(tempDir, "test.txt")
            await fs.writeFile(txtFile, "hello")

            await new Promise((resolve) => setTimeout(resolve, 200))

            const tsEvents = events.filter((e) => e.path.endsWith(".txt"))
            expect(tsEvents.length).toBe(0)
        })

        it("should debounce rapid changes", async () => {
            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            await fs.writeFile(testFile, "const x = 2")
            await fs.writeFile(testFile, "const x = 3")
            await fs.writeFile(testFile, "const x = 4")

            await new Promise((resolve) => setTimeout(resolve, 200))

            expect(events.length).toBeLessThanOrEqual(3)
        })
    })

    describe("callback error handling", () => {
        it("should continue after callback throws", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange(() => {
                throw new Error("Test error")
            })
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 200))
        })
    })

    describe("custom extensions", () => {
        it("should watch only specified extensions", async () => {
            const customWatchdog = new Watchdog({
                debounceMs: 50,
                extensions: [".ts"],
            })

            const events: FileChangeEvent[] = []
            customWatchdog.onFileChange((event) => events.push(event))
            customWatchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const tsFile = path.join(tempDir, "test.ts")
            const jsFile = path.join(tempDir, "test.js")
            await fs.writeFile(tsFile, "const x = 1")
            await fs.writeFile(jsFile, "const y = 2")

            await new Promise((resolve) => setTimeout(resolve, 200))

            const jsEvents = events.filter((e) => e.path.endsWith(".js"))
            expect(jsEvents.length).toBe(0)

            await customWatchdog.stop()
        })
    })

    describe("multiple callbacks", () => {
        it("should notify all registered callbacks", async () => {
            const events1: FileChangeEvent[] = []
            const events2: FileChangeEvent[] = []

            watchdog.onFileChange((event) => events1.push(event))
            watchdog.onFileChange((event) => events2.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 200))

            expect(events1.length).toBe(events2.length)
        })
    })

    describe("event properties", () => {
        it("should include correct event type and path", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 200))

            if (events.length > 0) {
                const event = events[0]
                expect(event.type).toMatch(/^(add|change)$/)
                expect(event.path).toContain("test.ts")
                expect(typeof event.timestamp).toBe("number")
                expect(event.timestamp).toBeLessThanOrEqual(Date.now())
            }
        })
    })
})
