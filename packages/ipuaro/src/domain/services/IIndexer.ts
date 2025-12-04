import type { FileAST } from "../value-objects/FileAST.js"
import type { FileData } from "../value-objects/FileData.js"
import type { FileMeta } from "../value-objects/FileMeta.js"
import type { DepsGraph, SymbolIndex } from "./IStorage.js"

/**
 * Progress callback for indexing operations.
 */
export interface IndexProgress {
    current: number
    total: number
    currentFile: string
    phase: "scanning" | "parsing" | "analyzing" | "indexing"
}

/**
 * Result of scanning a single file.
 */
export interface ScanResult {
    path: string
    type: "file" | "directory" | "symlink"
    size: number
    lastModified: number
    symlinkTarget?: string
}

/**
 * Indexing result statistics.
 */
export interface IndexingStats {
    filesScanned: number
    filesParsed: number
    parseErrors: number
    timeMs: number
}

/**
 * Indexer service interface (port).
 * Handles project scanning, parsing, and indexing.
 */
export interface IIndexer {
    /**
     * Scan directory and yield file results.
     */
    scan(root: string): AsyncGenerator<ScanResult>

    /**
     * Parse file content into AST.
     */
    parseFile(content: string, language: "ts" | "tsx" | "js" | "jsx" | "json" | "yaml"): FileAST

    /**
     * Analyze file and compute metadata.
     */
    analyzeFile(path: string, ast: FileAST, allASTs: Map<string, FileAST>): FileMeta

    /**
     * Build symbol index from all ASTs.
     */
    buildSymbolIndex(asts: Map<string, FileAST>): SymbolIndex

    /**
     * Build dependency graph from all ASTs.
     */
    buildDepsGraph(asts: Map<string, FileAST>): DepsGraph

    /**
     * Full indexing pipeline.
     */
    indexProject(
        root: string,
        onProgress?: (progress: IndexProgress) => void,
    ): Promise<IndexingStats>

    /**
     * Update single file (incremental indexing).
     */
    updateFile(path: string, data: FileData): Promise<void>

    /**
     * Remove file from index.
     */
    removeFile(path: string): Promise<void>
}
