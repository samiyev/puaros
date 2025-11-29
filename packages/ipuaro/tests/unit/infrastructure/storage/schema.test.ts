import { describe, it, expect } from "vitest"
import {
    ProjectKeys,
    SessionKeys,
    IndexFields,
    SessionFields,
    generateProjectName,
} from "../../../../src/infrastructure/storage/schema.js"

describe("schema", () => {
    describe("ProjectKeys", () => {
        it("should generate files key", () => {
            expect(ProjectKeys.files("myproject")).toBe("project:myproject:files")
        })

        it("should generate ast key", () => {
            expect(ProjectKeys.ast("myproject")).toBe("project:myproject:ast")
        })

        it("should generate meta key", () => {
            expect(ProjectKeys.meta("myproject")).toBe("project:myproject:meta")
        })

        it("should generate indexes key", () => {
            expect(ProjectKeys.indexes("myproject")).toBe("project:myproject:indexes")
        })

        it("should generate config key", () => {
            expect(ProjectKeys.config("myproject")).toBe("project:myproject:config")
        })
    })

    describe("SessionKeys", () => {
        it("should generate data key", () => {
            expect(SessionKeys.data("session-123")).toBe("session:session-123:data")
        })

        it("should generate undo key", () => {
            expect(SessionKeys.undo("session-123")).toBe("session:session-123:undo")
        })

        it("should have list key", () => {
            expect(SessionKeys.list).toBe("sessions:list")
        })
    })

    describe("IndexFields", () => {
        it("should have symbols field", () => {
            expect(IndexFields.symbols).toBe("symbols")
        })

        it("should have depsGraph field", () => {
            expect(IndexFields.depsGraph).toBe("deps_graph")
        })
    })

    describe("SessionFields", () => {
        it("should have all required fields", () => {
            expect(SessionFields.history).toBe("history")
            expect(SessionFields.context).toBe("context")
            expect(SessionFields.stats).toBe("stats")
            expect(SessionFields.inputHistory).toBe("input_history")
            expect(SessionFields.createdAt).toBe("created_at")
            expect(SessionFields.lastActivityAt).toBe("last_activity_at")
            expect(SessionFields.projectName).toBe("project_name")
        })
    })

    describe("generateProjectName", () => {
        it("should generate name from path with two parts", () => {
            expect(generateProjectName("/home/user/projects/myapp")).toBe("projects-myapp")
        })

        it("should generate name from single directory", () => {
            expect(generateProjectName("/app")).toBe("app")
        })

        it("should handle root path", () => {
            expect(generateProjectName("/")).toBe("root")
        })

        it("should handle empty path", () => {
            expect(generateProjectName("")).toBe("root")
        })

        it("should handle trailing slashes", () => {
            expect(generateProjectName("/home/user/projects/myapp/")).toBe("projects-myapp")
        })

        it("should handle Windows paths", () => {
            expect(generateProjectName("C:\\Users\\projects\\myapp")).toBe("projects-myapp")
        })

        it("should sanitize special characters", () => {
            expect(generateProjectName("/home/my project/my@app!")).toBe("my-project-my-app")
        })

        it("should convert to lowercase", () => {
            expect(generateProjectName("/Home/User/MYAPP")).toBe("user-myapp")
        })

        it("should handle multiple consecutive special chars", () => {
            expect(generateProjectName("/home/my___project")).toBe("home-my-project")
        })

        it("should handle relative paths", () => {
            expect(generateProjectName("parent/child")).toBe("parent-child")
        })
    })
})
