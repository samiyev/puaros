import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { Project } from "../../../../src/domain/entities/Project.js"

describe("Project", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("constructor", () => {
        it("should create project with generated name", () => {
            const project = new Project("/home/user/projects/myapp")

            expect(project.rootPath).toBe("/home/user/projects/myapp")
            expect(project.name).toBe("projects-myapp")
            expect(project.createdAt).toBe(Date.now())
            expect(project.lastIndexedAt).toBeNull()
            expect(project.fileCount).toBe(0)
            expect(project.indexingInProgress).toBe(false)
        })

        it("should accept custom createdAt", () => {
            const customTime = 1000000
            const project = new Project("/path", customTime)

            expect(project.createdAt).toBe(customTime)
        })
    })

    describe("generateProjectName", () => {
        it("should generate name from parent and project folder", () => {
            expect(Project.generateProjectName("/home/user/projects/myapp")).toBe("projects-myapp")
        })

        it("should handle root-level project", () => {
            expect(Project.generateProjectName("/myapp")).toBe("myapp")
        })
    })

    describe("indexing lifecycle", () => {
        it("should mark indexing started", () => {
            const project = new Project("/path")

            project.markIndexingStarted()

            expect(project.indexingInProgress).toBe(true)
        })

        it("should mark indexing completed", () => {
            const project = new Project("/path")
            project.markIndexingStarted()

            project.markIndexingCompleted(100)

            expect(project.indexingInProgress).toBe(false)
            expect(project.lastIndexedAt).toBe(Date.now())
            expect(project.fileCount).toBe(100)
        })

        it("should mark indexing failed", () => {
            const project = new Project("/path")
            project.markIndexingStarted()

            project.markIndexingFailed()

            expect(project.indexingInProgress).toBe(false)
            expect(project.lastIndexedAt).toBeNull()
        })
    })

    describe("isIndexed", () => {
        it("should return false when not indexed", () => {
            const project = new Project("/path")

            expect(project.isIndexed()).toBe(false)
        })

        it("should return true when indexed", () => {
            const project = new Project("/path")
            project.markIndexingCompleted(10)

            expect(project.isIndexed()).toBe(true)
        })
    })

    describe("getTimeSinceIndexed", () => {
        it("should return null when not indexed", () => {
            const project = new Project("/path")

            expect(project.getTimeSinceIndexed()).toBeNull()
        })

        it("should return time since last indexed", () => {
            const project = new Project("/path")
            project.markIndexingCompleted(10)

            vi.advanceTimersByTime(5000)

            expect(project.getTimeSinceIndexed()).toBe(5000)
        })
    })
})
