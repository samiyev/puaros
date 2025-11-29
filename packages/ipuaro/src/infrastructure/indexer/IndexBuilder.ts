import * as path from "node:path"
import type { FileAST } from "../../domain/value-objects/FileAST.js"
import type { DepsGraph, SymbolIndex, SymbolLocation } from "../../domain/services/IStorage.js"

/**
 * Builds searchable indexes from parsed ASTs.
 */
export class IndexBuilder {
    private readonly projectRoot: string

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot
    }

    /**
     * Build symbol index from all ASTs.
     * Maps symbol names to their locations for quick lookup.
     */
    buildSymbolIndex(asts: Map<string, FileAST>): SymbolIndex {
        const index: SymbolIndex = new Map()

        for (const [filePath, ast] of asts) {
            this.indexFunctions(filePath, ast, index)
            this.indexClasses(filePath, ast, index)
            this.indexInterfaces(filePath, ast, index)
            this.indexTypeAliases(filePath, ast, index)
            this.indexExportedVariables(filePath, ast, index)
        }

        return index
    }

    /**
     * Index function declarations.
     */
    private indexFunctions(filePath: string, ast: FileAST, index: SymbolIndex): void {
        for (const func of ast.functions) {
            this.addSymbol(index, func.name, {
                path: filePath,
                line: func.lineStart,
                type: "function",
            })
        }
    }

    /**
     * Index class declarations.
     */
    private indexClasses(filePath: string, ast: FileAST, index: SymbolIndex): void {
        for (const cls of ast.classes) {
            this.addSymbol(index, cls.name, {
                path: filePath,
                line: cls.lineStart,
                type: "class",
            })

            for (const method of cls.methods) {
                const qualifiedName = `${cls.name}.${method.name}`
                this.addSymbol(index, qualifiedName, {
                    path: filePath,
                    line: method.lineStart,
                    type: "function",
                })
            }
        }
    }

    /**
     * Index interface declarations.
     */
    private indexInterfaces(filePath: string, ast: FileAST, index: SymbolIndex): void {
        for (const iface of ast.interfaces) {
            this.addSymbol(index, iface.name, {
                path: filePath,
                line: iface.lineStart,
                type: "interface",
            })
        }
    }

    /**
     * Index type alias declarations.
     */
    private indexTypeAliases(filePath: string, ast: FileAST, index: SymbolIndex): void {
        for (const typeAlias of ast.typeAliases) {
            this.addSymbol(index, typeAlias.name, {
                path: filePath,
                line: typeAlias.line,
                type: "type",
            })
        }
    }

    /**
     * Index exported variables (not functions).
     */
    private indexExportedVariables(filePath: string, ast: FileAST, index: SymbolIndex): void {
        const functionNames = new Set(ast.functions.map((f) => f.name))

        for (const exp of ast.exports) {
            if (exp.kind === "variable" && !functionNames.has(exp.name)) {
                this.addSymbol(index, exp.name, {
                    path: filePath,
                    line: exp.line,
                    type: "variable",
                })
            }
        }
    }

    /**
     * Add a symbol to the index.
     */
    private addSymbol(index: SymbolIndex, name: string, location: SymbolLocation): void {
        if (!name) {
            return
        }

        const existing = index.get(name)
        if (existing) {
            const isDuplicate = existing.some(
                (loc) => loc.path === location.path && loc.line === location.line,
            )
            if (!isDuplicate) {
                existing.push(location)
            }
        } else {
            index.set(name, [location])
        }
    }

    /**
     * Build dependency graph from all ASTs.
     * Creates bidirectional mapping of imports.
     */
    buildDepsGraph(asts: Map<string, FileAST>): DepsGraph {
        const imports = new Map<string, string[]>()
        const importedBy = new Map<string, string[]>()

        for (const filePath of asts.keys()) {
            imports.set(filePath, [])
            importedBy.set(filePath, [])
        }

        for (const [filePath, ast] of asts) {
            const fileImports = this.resolveFileImports(filePath, ast, asts)
            imports.set(filePath, fileImports)

            for (const importedFile of fileImports) {
                const dependents = importedBy.get(importedFile) ?? []
                if (!dependents.includes(filePath)) {
                    dependents.push(filePath)
                    importedBy.set(importedFile, dependents)
                }
            }
        }

        for (const [filePath, deps] of imports) {
            imports.set(filePath, deps.sort())
        }
        for (const [filePath, deps] of importedBy) {
            importedBy.set(filePath, deps.sort())
        }

        return { imports, importedBy }
    }

    /**
     * Resolve internal imports for a file.
     */
    private resolveFileImports(
        filePath: string,
        ast: FileAST,
        allASTs: Map<string, FileAST>,
    ): string[] {
        const fileDir = path.dirname(filePath)
        const resolvedImports: string[] = []

        for (const imp of ast.imports) {
            if (imp.type !== "internal") {
                continue
            }

            const resolved = this.resolveImportPath(fileDir, imp.from, allASTs)
            if (resolved && !resolvedImports.includes(resolved)) {
                resolvedImports.push(resolved)
            }
        }

        return resolvedImports
    }

    /**
     * Resolve import path to actual file path.
     */
    private resolveImportPath(
        fromDir: string,
        importPath: string,
        allASTs: Map<string, FileAST>,
    ): string | null {
        const absolutePath = path.resolve(fromDir, importPath)

        const candidates = this.getImportCandidates(absolutePath)
        for (const candidate of candidates) {
            if (allASTs.has(candidate)) {
                return candidate
            }
        }

        return null
    }

    /**
     * Generate possible file paths for an import.
     */
    private getImportCandidates(basePath: string): string[] {
        const candidates: string[] = []

        if (/\.(ts|tsx|js|jsx)$/.test(basePath)) {
            candidates.push(basePath)

            if (basePath.endsWith(".js")) {
                candidates.push(`${basePath.slice(0, -3)}.ts`)
            } else if (basePath.endsWith(".jsx")) {
                candidates.push(`${basePath.slice(0, -4)}.tsx`)
            }
        } else {
            candidates.push(`${basePath}.ts`)
            candidates.push(`${basePath}.tsx`)
            candidates.push(`${basePath}.js`)
            candidates.push(`${basePath}.jsx`)
            candidates.push(`${basePath}/index.ts`)
            candidates.push(`${basePath}/index.tsx`)
            candidates.push(`${basePath}/index.js`)
            candidates.push(`${basePath}/index.jsx`)
        }

        return candidates
    }

    /**
     * Find all locations of a symbol by name.
     */
    findSymbol(index: SymbolIndex, name: string): SymbolLocation[] {
        return index.get(name) ?? []
    }

    /**
     * Find symbols matching a pattern.
     */
    searchSymbols(index: SymbolIndex, pattern: string): Map<string, SymbolLocation[]> {
        const results = new Map<string, SymbolLocation[]>()
        const regex = new RegExp(pattern, "i")

        for (const [name, locations] of index) {
            if (regex.test(name)) {
                results.set(name, locations)
            }
        }

        return results
    }

    /**
     * Get all files that the given file depends on (imports).
     */
    getDependencies(graph: DepsGraph, filePath: string): string[] {
        return graph.imports.get(filePath) ?? []
    }

    /**
     * Get all files that depend on the given file (import it).
     */
    getDependents(graph: DepsGraph, filePath: string): string[] {
        return graph.importedBy.get(filePath) ?? []
    }

    /**
     * Find circular dependencies in the graph.
     */
    findCircularDependencies(graph: DepsGraph): string[][] {
        const cycles: string[][] = []
        const visited = new Set<string>()
        const recursionStack = new Set<string>()

        const dfs = (node: string, path: string[]): void => {
            visited.add(node)
            recursionStack.add(node)
            path.push(node)

            const deps = graph.imports.get(node) ?? []
            for (const dep of deps) {
                if (!visited.has(dep)) {
                    dfs(dep, [...path])
                } else if (recursionStack.has(dep)) {
                    const cycleStart = path.indexOf(dep)
                    if (cycleStart !== -1) {
                        const cycle = [...path.slice(cycleStart), dep]
                        const normalized = this.normalizeCycle(cycle)
                        if (!this.cycleExists(cycles, normalized)) {
                            cycles.push(normalized)
                        }
                    }
                }
            }

            recursionStack.delete(node)
        }

        for (const node of graph.imports.keys()) {
            if (!visited.has(node)) {
                dfs(node, [])
            }
        }

        return cycles
    }

    /**
     * Normalize a cycle to start with the smallest path.
     */
    private normalizeCycle(cycle: string[]): string[] {
        if (cycle.length <= 1) {
            return cycle
        }

        const withoutLast = cycle.slice(0, -1)
        const minIndex = withoutLast.reduce(
            (minIdx, path, idx) => (path < withoutLast[minIdx] ? idx : minIdx),
            0,
        )

        const rotated = [...withoutLast.slice(minIndex), ...withoutLast.slice(0, minIndex)]
        rotated.push(rotated[0])

        return rotated
    }

    /**
     * Check if a cycle already exists in the list.
     */
    private cycleExists(cycles: string[][], newCycle: string[]): boolean {
        const newKey = newCycle.join("→")
        return cycles.some((cycle) => cycle.join("→") === newKey)
    }

    /**
     * Get statistics about the indexes.
     */
    getStats(
        symbolIndex: SymbolIndex,
        depsGraph: DepsGraph,
    ): {
        totalSymbols: number
        symbolsByType: Record<SymbolLocation["type"], number>
        totalFiles: number
        totalDependencies: number
        averageDependencies: number
        hubs: string[]
        orphans: string[]
    } {
        const symbolsByType: Record<SymbolLocation["type"], number> = {
            function: 0,
            class: 0,
            interface: 0,
            type: 0,
            variable: 0,
        }

        let totalSymbols = 0
        for (const locations of symbolIndex.values()) {
            totalSymbols += locations.length
            for (const loc of locations) {
                symbolsByType[loc.type]++
            }
        }

        const totalFiles = depsGraph.imports.size
        let totalDependencies = 0
        const hubs: string[] = []
        const orphans: string[] = []

        for (const [_filePath, deps] of depsGraph.imports) {
            totalDependencies += deps.length
        }

        for (const [filePath, dependents] of depsGraph.importedBy) {
            if (dependents.length > 5) {
                hubs.push(filePath)
            }
            if (dependents.length === 0 && (depsGraph.imports.get(filePath)?.length ?? 0) === 0) {
                orphans.push(filePath)
            }
        }

        return {
            totalSymbols,
            symbolsByType,
            totalFiles,
            totalDependencies,
            averageDependencies: totalFiles > 0 ? totalDependencies / totalFiles : 0,
            hubs: hubs.sort(),
            orphans: orphans.sort(),
        }
    }
}
