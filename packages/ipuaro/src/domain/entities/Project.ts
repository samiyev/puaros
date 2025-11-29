import { basename, dirname } from "node:path"

/**
 * Project entity representing an indexed codebase.
 */
export class Project {
    readonly name: string
    readonly rootPath: string
    readonly createdAt: number
    lastIndexedAt: number | null
    fileCount: number
    indexingInProgress: boolean

    constructor(rootPath: string, createdAt?: number) {
        this.rootPath = rootPath
        this.name = Project.generateProjectName(rootPath)
        this.createdAt = createdAt ?? Date.now()
        this.lastIndexedAt = null
        this.fileCount = 0
        this.indexingInProgress = false
    }

    /**
     * Generate project name from path.
     * Format: {parent-folder}-{project-folder}
     */
    static generateProjectName(rootPath: string): string {
        const projectFolder = basename(rootPath)
        const parentFolder = basename(dirname(rootPath))

        if (parentFolder && parentFolder !== ".") {
            return `${parentFolder}-${projectFolder}`
        }
        return projectFolder
    }

    markIndexingStarted(): void {
        this.indexingInProgress = true
    }

    markIndexingCompleted(fileCount: number): void {
        this.indexingInProgress = false
        this.lastIndexedAt = Date.now()
        this.fileCount = fileCount
    }

    markIndexingFailed(): void {
        this.indexingInProgress = false
    }

    isIndexed(): boolean {
        return this.lastIndexedAt !== null
    }

    getTimeSinceIndexed(): number | null {
        if (this.lastIndexedAt === null) {
            return null
        }
        return Date.now() - this.lastIndexedAt
    }
}
