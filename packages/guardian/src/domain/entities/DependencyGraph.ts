import { BaseEntity } from "./BaseEntity"
import { SourceFile } from "./SourceFile"

interface GraphNode {
    file: SourceFile
    dependencies: string[]
    dependents: string[]
}

/**
 * Represents dependency graph of the analyzed project
 */
export class DependencyGraph extends BaseEntity {
    private readonly nodes: Map<string, GraphNode>

    constructor(id?: string) {
        super(id)
        this.nodes = new Map()
    }

    public addFile(file: SourceFile): void {
        const fileId = file.path.relative

        if (!this.nodes.has(fileId)) {
            this.nodes.set(fileId, {
                file,
                dependencies: [],
                dependents: [],
            })
        }

        this.touch()
    }

    public addDependency(from: string, to: string): void {
        const fromNode = this.nodes.get(from)
        const toNode = this.nodes.get(to)

        if (fromNode && toNode) {
            if (!fromNode.dependencies.includes(to)) {
                fromNode.dependencies.push(to)
            }
            if (!toNode.dependents.includes(from)) {
                toNode.dependents.push(from)
            }
            this.touch()
        }
    }

    public getNode(filePath: string): GraphNode | undefined {
        return this.nodes.get(filePath)
    }

    public getAllNodes(): GraphNode[] {
        return Array.from(this.nodes.values())
    }

    public findCycles(): string[][] {
        const cycles: string[][] = []
        const visited = new Set<string>()
        const recursionStack = new Set<string>()

        const dfs = (nodeId: string, path: string[]): void => {
            visited.add(nodeId)
            recursionStack.add(nodeId)
            path.push(nodeId)

            const node = this.nodes.get(nodeId)
            if (node) {
                for (const dep of node.dependencies) {
                    if (!visited.has(dep)) {
                        dfs(dep, [...path])
                    } else if (recursionStack.has(dep)) {
                        const cycleStart = path.indexOf(dep)
                        cycles.push(path.slice(cycleStart))
                    }
                }
            }

            recursionStack.delete(nodeId)
        }

        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                dfs(nodeId, [])
            }
        }

        return cycles
    }

    public getMetrics(): {
        totalFiles: number
        totalDependencies: number
        avgDependencies: number
        maxDependencies: number
        } {
        const nodes = Array.from(this.nodes.values())
        const totalFiles = nodes.length
        const totalDependencies = nodes.reduce((sum, node) => sum + node.dependencies.length, 0)

        return {
            totalFiles,
            totalDependencies,
            avgDependencies: totalFiles > 0 ? totalDependencies / totalFiles : 0,
            maxDependencies: Math.max(...nodes.map((node) => node.dependencies.length), 0),
        }
    }
}
