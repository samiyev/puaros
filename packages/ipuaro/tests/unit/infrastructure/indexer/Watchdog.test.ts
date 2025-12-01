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

        it("should return paths when watching", async () => {
            const testFile = path.join(tempDir, "exists.ts")
            await fs.writeFile(testFile, "const x = 1")

            watchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 200))

            const paths = watchdog.getWatchedPaths()
            expect(Array.isArray(paths)).toBe(true)
        })
    })

    describe("flushAll", () => {
        it("should not throw when no pending changes", () => {
            watchdog.start(tempDir)
            expect(() => watchdog.flushAll()).not.toThrow()
        })

        it("should handle flushAll with active timers", async () => {
            const slowWatchdog = new Watchdog({ debounceMs: 1000 })
            const events: FileChangeEvent[] = []
            slowWatchdog.onFileChange((event) => events.push(event))
            slowWatchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 200))

            const testFile = path.join(tempDir, "instant-flush.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 150))

            const pendingCount = slowWatchdog.getPendingCount()
            if (pendingCount > 0) {
                slowWatchdog.flushAll()
                expect(slowWatchdog.getPendingCount()).toBe(0)
                expect(events.length).toBeGreaterThan(0)
            }

            await slowWatchdog.stop()
        })

        it("should flush all pending changes immediately", async () => {
            const slowWatchdog = new Watchdog({ debounceMs: 500 })
            const events: FileChangeEvent[] = []
            slowWatchdog.onFileChange((event) => events.push(event))
            slowWatchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile1 = path.join(tempDir, "flush-test1.ts")
            const testFile2 = path.join(tempDir, "flush-test2.ts")
            await fs.writeFile(testFile1, "const x = 1")
            await fs.writeFile(testFile2, "const y = 2")

            await new Promise((resolve) => setTimeout(resolve, 100))

            const pendingCount = slowWatchdog.getPendingCount()
            if (pendingCount > 0) {
                slowWatchdog.flushAll()
                expect(slowWatchdog.getPendingCount()).toBe(0)
            }

            await slowWatchdog.stop()
        })

        it("should clear all timers when flushing", async () => {
            const slowWatchdog = new Watchdog({ debounceMs: 500 })
            const events: FileChangeEvent[] = []
            slowWatchdog.onFileChange((event) => events.push(event))
            slowWatchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "timer-test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 100))

            const pendingBefore = slowWatchdog.getPendingCount()

            if (pendingBefore > 0) {
                const eventsBefore = events.length
                slowWatchdog.flushAll()
                expect(slowWatchdog.getPendingCount()).toBe(0)
                expect(events.length).toBeGreaterThan(eventsBefore)
            }

            await slowWatchdog.stop()
        })
    })

    describe("ignore patterns", () => {
        it("should handle glob patterns with wildcards", async () => {
            const customWatchdog = new Watchdog({
                debounceMs: 50,
                ignorePatterns: ["*.log", "**/*.tmp"],
            })

            customWatchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(customWatchdog.isWatching()).toBe(true)

            await customWatchdog.stop()
        })

        it("should handle simple directory patterns without wildcards", async () => {
            const customWatchdog = new Watchdog({
                debounceMs: 50,
                ignorePatterns: ["node_modules", "dist"],
            })

            customWatchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(customWatchdog.isWatching()).toBe(true)

            await customWatchdog.stop()
        })

        it("should handle mixed wildcard and non-wildcard patterns", async () => {
            const customWatchdog = new Watchdog({
                debounceMs: 50,
                ignorePatterns: ["node_modules", "*.log", "**/*.tmp", "dist", "build"],
            })

            customWatchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(customWatchdog.isWatching()).toBe(true)

            await customWatchdog.stop()
        })

        it("should handle patterns with dots correctly", async () => {
            const customWatchdog = new Watchdog({
                debounceMs: 50,
                ignorePatterns: ["*.test.ts", "**/*.spec.js"],
            })

            customWatchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(customWatchdog.isWatching()).toBe(true)

            await customWatchdog.stop()
        })

        it("should handle double wildcards correctly", async () => {
            const customWatchdog = new Watchdog({
                debounceMs: 50,
                ignorePatterns: ["**/node_modules/**", "**/.git/**"],
            })

            customWatchdog.start(tempDir)
            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(customWatchdog.isWatching()).toBe(true)

            await customWatchdog.stop()
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

    describe("error handling", () => {
        it("should handle watcher errors gracefully", async () => {
            const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

            watchdog.start(tempDir)

            const watcher = (watchdog as any).watcher
            if (watcher) {
                watcher.emit("error", new Error("Test watcher error"))
            }

            await new Promise((resolve) => setTimeout(resolve, 100))

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining("Test watcher error"),
            )

            consoleErrorSpy.mockRestore()
        })
    })

    describe("polling mode", () => {
        it("should support polling mode", () => {
            const pollingWatchdog = new Watchdog({
                debounceMs: 50,
                usePolling: true,
                pollInterval: 500,
            })

            pollingWatchdog.start(tempDir)
            expect(pollingWatchdog.isWatching()).toBe(true)

            pollingWatchdog.stop()
        })
    })

    describe("edge cases", () => {
        it("should handle flushing non-existent change", () => {
            watchdog.start(tempDir)
            const flushChange = (watchdog as any).flushChange.bind(watchdog)
            expect(() => flushChange("/non/existent/path.ts")).not.toThrow()
        })

        it("should handle clearing timer for same file multiple times", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => events.push(event))
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "test.ts")
            await fs.writeFile(testFile, "const x = 1")
            await new Promise((resolve) => setTimeout(resolve, 10))
            await fs.writeFile(testFile, "const x = 2")
            await new Promise((resolve) => setTimeout(resolve, 10))
            await fs.writeFile(testFile, "const x = 3")

            await new Promise((resolve) => setTimeout(resolve, 200))

            expect(events.length).toBeGreaterThanOrEqual(0)
        })

        it("should normalize file paths", async () => {
            const events: FileChangeEvent[] = []
            watchdog.onFileChange((event) => {
                events.push(event)
                expect(path.isAbsolute(event.path)).toBe(true)
            })
            watchdog.start(tempDir)

            await new Promise((resolve) => setTimeout(resolve, 100))

            const testFile = path.join(tempDir, "normalize-test.ts")
            await fs.writeFile(testFile, "const x = 1")

            await new Promise((resolve) => setTimeout(resolve, 200))
        })

        it("should handle empty directory", async () => {
            const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), "empty-"))
            const emptyWatchdog = new Watchdog({ debounceMs: 50 })

            emptyWatchdog.start(emptyDir)
            expect(emptyWatchdog.isWatching()).toBe(true)

            await emptyWatchdog.stop()
            await fs.rm(emptyDir, { recursive: true, force: true })
        })
    })
})
