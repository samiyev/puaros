import * as fs from "node:fs/promises"
import type { Stats } from "node:fs"
import * as path from "node:path"
import { globby } from "globby"
import {
    BINARY_EXTENSIONS,
    DEFAULT_IGNORE_PATTERNS,
    SUPPORTED_EXTENSIONS,
} from "../../domain/constants/index.js"
import type { ScanResult } from "../../domain/services/IIndexer.js"

/**
 * Progress callback for file scanning.
 */
export interface ScanProgress {
    current: number
    total: number
    currentFile: string
}

/**
 * Options for FileScanner.
 */
export interface FileScannerOptions {
    /** Additional ignore patterns (besides .gitignore and defaults) */
    additionalIgnore?: string[]
    /** Only include files with these extensions. Defaults to SUPPORTED_EXTENSIONS. */
    extensions?: readonly string[]
    /** Callback for progress updates */
    onProgress?: (progress: ScanProgress) => void
}

/**
 * Scans project directories recursively using globby.
 * Respects .gitignore, skips binary files and default ignore patterns.
 */
export class FileScanner {
    private readonly extensions: Set<string>
    private readonly additionalIgnore: string[]
    private readonly onProgress?: (progress: ScanProgress) => void

    constructor(options: FileScannerOptions = {}) {
        this.extensions = new Set(options.extensions ?? SUPPORTED_EXTENSIONS)
        this.additionalIgnore = options.additionalIgnore ?? []
        this.onProgress = options.onProgress
    }

    /**
     * Build glob patterns from extensions.
     */
    private buildGlobPatterns(): string[] {
        const exts = [...this.extensions].map((ext) => ext.replace(".", ""))
        if (exts.length === 1) {
            return [`**/*.${exts[0]}`]
        }
        return [`**/*.{${exts.join(",")}}`]
    }

    /**
     * Build ignore patterns.
     */
    private buildIgnorePatterns(): string[] {
        const patterns = [
            ...DEFAULT_IGNORE_PATTERNS,
            ...this.additionalIgnore,
            ...BINARY_EXTENSIONS.map((ext) => `**/*${ext}`),
        ]
        return patterns
    }

    /**
     * Scan directory and yield file results.
     * @param root - Root directory to scan
     */
    async *scan(root: string): AsyncGenerator<ScanResult> {
        const globPatterns = this.buildGlobPatterns()
        const ignorePatterns = this.buildIgnorePatterns()

        const files = await globby(globPatterns, {
            cwd: root,
            gitignore: true,
            ignore: ignorePatterns,
            absolute: false,
            onlyFiles: true,
            followSymbolicLinks: false,
        })

        const total = files.length
        let current = 0

        for (const relativePath of files) {
            current++
            this.reportProgress(relativePath, current, total)

            const fullPath = path.join(root, relativePath)
            const stats = await this.safeStats(fullPath)

            if (stats) {
                const type = stats.isSymbolicLink()
                    ? "symlink"
                    : stats.isDirectory()
                      ? "directory"
                      : "file"

                const result: ScanResult = {
                    path: relativePath,
                    type,
                    size: stats.size,
                    lastModified: stats.mtimeMs,
                }

                if (type === "symlink") {
                    const target = await this.safeReadlink(fullPath)
                    if (target) {
                        result.symlinkTarget = target
                    }
                }

                yield result
            }
        }
    }

    /**
     * Scan and return all results as array.
     */
    async scanAll(root: string): Promise<ScanResult[]> {
        const results: ScanResult[] = []
        for await (const result of this.scan(root)) {
            results.push(result)
        }
        return results
    }

    /**
     * Check if file has supported extension.
     */
    isSupportedExtension(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase()
        return this.extensions.has(ext)
    }

    /**
     * Safely get file stats without throwing.
     * Uses lstat to get information about symlinks themselves.
     */
    private async safeStats(filePath: string): Promise<Stats | null> {
        try {
            return await fs.lstat(filePath)
        } catch {
            return null
        }
    }

    /**
     * Safely read symlink target without throwing.
     */
    private async safeReadlink(filePath: string): Promise<string | null> {
        try {
            return await fs.readlink(filePath)
        } catch {
            return null
        }
    }

    /**
     * Report progress if callback is set.
     */
    private reportProgress(currentFile: string, current: number, total: number): void {
        if (this.onProgress) {
            this.onProgress({ current, total, currentFile })
        }
    }

    /**
     * Check if file content is likely UTF-8 text.
     * Reads first 8KB and checks for null bytes.
     */
    static async isTextFile(filePath: string): Promise<boolean> {
        try {
            const handle = await fs.open(filePath, "r")
            try {
                const buffer = Buffer.alloc(8192)
                const { bytesRead } = await handle.read(buffer, 0, 8192, 0)
                if (bytesRead === 0) {
                    return true
                }
                for (let i = 0; i < bytesRead; i++) {
                    if (buffer[i] === 0) {
                        return false
                    }
                }
                return true
            } finally {
                await handle.close()
            }
        } catch {
            return false
        }
    }

    /**
     * Read file content as string.
     * Returns null if file is binary or unreadable.
     */
    static async readFileContent(filePath: string): Promise<string | null> {
        if (!(await FileScanner.isTextFile(filePath))) {
            return null
        }
        try {
            return await fs.readFile(filePath, "utf-8")
        } catch {
            return null
        }
    }
}
