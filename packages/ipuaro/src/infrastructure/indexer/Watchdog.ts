import * as chokidar from "chokidar"
import * as path from "node:path"
import { DEFAULT_IGNORE_PATTERNS, SUPPORTED_EXTENSIONS } from "../../domain/constants/index.js"

export type FileChangeType = "add" | "change" | "unlink"

export interface FileChangeEvent {
    type: FileChangeType
    path: string
    timestamp: number
}

export type FileChangeCallback = (event: FileChangeEvent) => void

export interface WatchdogOptions {
    /** Debounce delay in milliseconds (default: 500) */
    debounceMs?: number
    /** Patterns to ignore (default: DEFAULT_IGNORE_PATTERNS) */
    ignorePatterns?: readonly string[]
    /** File extensions to watch (default: SUPPORTED_EXTENSIONS) */
    extensions?: readonly string[]
    /** Use polling instead of native events (useful for network drives) */
    usePolling?: boolean
    /** Polling interval in milliseconds (default: 1000) */
    pollInterval?: number
}

interface ResolvedWatchdogOptions {
    debounceMs: number
    ignorePatterns: readonly string[]
    extensions: readonly string[]
    usePolling: boolean
    pollInterval: number
}

const DEFAULT_OPTIONS: ResolvedWatchdogOptions = {
    debounceMs: 500,
    ignorePatterns: DEFAULT_IGNORE_PATTERNS,
    extensions: SUPPORTED_EXTENSIONS,
    usePolling: false,
    pollInterval: 1000,
}

/**
 * Watches for file changes in a directory using chokidar.
 */
export class Watchdog {
    private watcher: chokidar.FSWatcher | null = null
    private readonly callbacks: FileChangeCallback[] = []
    private readonly pendingChanges = new Map<string, FileChangeEvent>()
    private readonly debounceTimers = new Map<string, NodeJS.Timeout>()
    private readonly options: ResolvedWatchdogOptions
    private root = ""
    private isRunning = false

    constructor(options: WatchdogOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options }
    }

    /**
     * Start watching a directory for file changes.
     */
    start(root: string): void {
        if (this.isRunning) {
            void this.stop()
        }

        this.root = root
        this.isRunning = true

        const globPatterns = this.buildGlobPatterns(root)
        const ignorePatterns = this.buildIgnorePatterns()

        this.watcher = chokidar.watch(globPatterns, {
            ignored: ignorePatterns,
            persistent: true,
            ignoreInitial: true,
            usePolling: this.options.usePolling,
            interval: this.options.pollInterval,
            awaitWriteFinish: {
                stabilityThreshold: 100,
                pollInterval: 100,
            },
        })

        this.watcher.on("add", (filePath) => {
            this.handleChange("add", filePath)
        })
        this.watcher.on("change", (filePath) => {
            this.handleChange("change", filePath)
        })
        this.watcher.on("unlink", (filePath) => {
            this.handleChange("unlink", filePath)
        })
        this.watcher.on("error", (error) => {
            this.handleError(error)
        })
    }

    /**
     * Stop watching for file changes.
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            return
        }

        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer)
        }
        this.debounceTimers.clear()
        this.pendingChanges.clear()

        if (this.watcher) {
            await this.watcher.close()
            this.watcher = null
        }

        this.isRunning = false
    }

    /**
     * Register a callback for file change events.
     */
    onFileChange(callback: FileChangeCallback): void {
        this.callbacks.push(callback)
    }

    /**
     * Remove a callback.
     */
    offFileChange(callback: FileChangeCallback): void {
        const index = this.callbacks.indexOf(callback)
        if (index !== -1) {
            this.callbacks.splice(index, 1)
        }
    }

    /**
     * Check if the watchdog is currently running.
     */
    isWatching(): boolean {
        return this.isRunning
    }

    /**
     * Get the root directory being watched.
     */
    getRoot(): string {
        return this.root
    }

    /**
     * Get the number of pending changes waiting to be processed.
     */
    getPendingCount(): number {
        return this.pendingChanges.size
    }

    /**
     * Handle a file change event with debouncing.
     */
    private handleChange(type: FileChangeType, filePath: string): void {
        if (!this.isValidFile(filePath)) {
            return
        }

        const normalizedPath = path.resolve(filePath)

        const event: FileChangeEvent = {
            type,
            path: normalizedPath,
            timestamp: Date.now(),
        }

        this.pendingChanges.set(normalizedPath, event)

        const existingTimer = this.debounceTimers.get(normalizedPath)
        if (existingTimer) {
            clearTimeout(existingTimer)
        }

        const timer = setTimeout(() => {
            this.flushChange(normalizedPath)
        }, this.options.debounceMs)

        this.debounceTimers.set(normalizedPath, timer)
    }

    /**
     * Flush a pending change and notify callbacks.
     */
    private flushChange(filePath: string): void {
        const event = this.pendingChanges.get(filePath)
        if (!event) {
            return
        }

        this.pendingChanges.delete(filePath)
        this.debounceTimers.delete(filePath)

        for (const callback of this.callbacks) {
            try {
                callback(event)
            } catch {
                // Silently ignore callback errors
            }
        }
    }

    /**
     * Handle watcher errors.
     */
    private handleError(error: Error): void {
        // Log error but don't crash
        console.error(`[Watchdog] Error: ${error.message}`)
    }

    /**
     * Check if a file should be watched based on extension.
     */
    private isValidFile(filePath: string): boolean {
        const ext = path.extname(filePath)
        return this.options.extensions.includes(ext)
    }

    /**
     * Build glob patterns for watching.
     */
    private buildGlobPatterns(root: string): string[] {
        return this.options.extensions.map((ext) => path.join(root, "**", `*${ext}`))
    }

    /**
     * Build ignore patterns for chokidar.
     */
    private buildIgnorePatterns(): (string | RegExp)[] {
        const patterns: (string | RegExp)[] = []

        for (const pattern of this.options.ignorePatterns) {
            if (pattern.includes("*")) {
                const regexPattern = pattern
                    .replace(/\./g, "\\.")
                    .replace(/\*\*/g, ".*")
                    .replace(/\*/g, "[^/]*")
                patterns.push(new RegExp(regexPattern))
            } else {
                patterns.push(`**/${pattern}/**`)
            }
        }

        return patterns
    }

    /**
     * Force flush all pending changes immediately.
     */
    flushAll(): void {
        for (const timer of this.debounceTimers.values()) {
            clearTimeout(timer)
        }
        this.debounceTimers.clear()

        for (const filePath of this.pendingChanges.keys()) {
            this.flushChange(filePath)
        }
    }

    /**
     * Get watched paths (for debugging).
     */
    getWatchedPaths(): string[] {
        if (!this.watcher) {
            return []
        }
        const watched = this.watcher.getWatched()
        const paths: string[] = []
        for (const dir of Object.keys(watched)) {
            for (const file of watched[dir]) {
                paths.push(path.join(dir, file))
            }
        }
        return paths.sort()
    }
}
