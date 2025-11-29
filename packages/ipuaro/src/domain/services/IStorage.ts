import type { FileData } from "../value-objects/FileData.js"
import type { FileAST } from "../value-objects/FileAST.js"
import type { FileMeta } from "../value-objects/FileMeta.js"

/**
 * Symbol index mapping symbol names to their locations.
 */
export interface SymbolLocation {
    path: string
    line: number
    type: "function" | "class" | "interface" | "type" | "variable"
}

export type SymbolIndex = Map<string, SymbolLocation[]>

/**
 * Dependencies graph for the project.
 */
export interface DepsGraph {
    /** Map from file path to its imports */
    imports: Map<string, string[]>
    /** Map from file path to files that import it */
    importedBy: Map<string, string[]>
}

/**
 * Storage service interface (port).
 * Abstracts the persistence layer for project data.
 */
export interface IStorage {
    // File data operations
    getFile(path: string): Promise<FileData | null>
    setFile(path: string, data: FileData): Promise<void>
    deleteFile(path: string): Promise<void>
    getAllFiles(): Promise<Map<string, FileData>>
    getFileCount(): Promise<number>

    // AST operations
    getAST(path: string): Promise<FileAST | null>
    setAST(path: string, ast: FileAST): Promise<void>
    deleteAST(path: string): Promise<void>
    getAllASTs(): Promise<Map<string, FileAST>>

    // Meta operations
    getMeta(path: string): Promise<FileMeta | null>
    setMeta(path: string, meta: FileMeta): Promise<void>
    deleteMeta(path: string): Promise<void>
    getAllMetas(): Promise<Map<string, FileMeta>>

    // Index operations
    getSymbolIndex(): Promise<SymbolIndex>
    setSymbolIndex(index: SymbolIndex): Promise<void>
    getDepsGraph(): Promise<DepsGraph>
    setDepsGraph(graph: DepsGraph): Promise<void>

    // Config operations
    getProjectConfig(key: string): Promise<unknown>
    setProjectConfig(key: string, value: unknown): Promise<void>

    // Lifecycle
    connect(): Promise<void>
    disconnect(): Promise<void>
    isConnected(): boolean
    clear(): Promise<void>
}
