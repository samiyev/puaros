import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as path from "node:path"
import * as fs from "node:fs/promises"
import * as os from "node:os"
import {
    PathValidator,
    createPathValidator,
    validatePath,
} from "../../../../src/infrastructure/security/PathValidator.js"

describe("PathValidator", () => {
    let validator: PathValidator
    let tempDir: string
    let projectRoot: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pathvalidator-test-"))
        projectRoot = path.join(tempDir, "project")
        await fs.mkdir(projectRoot)
        validator = new PathValidator(projectRoot)
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    describe("constructor", () => {
        it("should resolve project root to absolute path", () => {
            const relativeValidator = new PathValidator("./project")
            expect(relativeValidator.getProjectRoot()).toBe(path.resolve("./project"))
        })

        it("should store project root", () => {
            expect(validator.getProjectRoot()).toBe(projectRoot)
        })
    })

    describe("validateSync", () => {
        it("should validate relative path within project", () => {
            const result = validator.validateSync("src/file.ts")
            expect(result.status).toBe("valid")
            expect(result.absolutePath).toBe(path.join(projectRoot, "src/file.ts"))
            expect(result.relativePath).toBe(path.join("src", "file.ts"))
        })

        it("should validate nested relative paths", () => {
            const result = validator.validateSync("src/components/Button.tsx")
            expect(result.status).toBe("valid")
        })

        it("should validate root level files", () => {
            const result = validator.validateSync("package.json")
            expect(result.status).toBe("valid")
            expect(result.relativePath).toBe("package.json")
        })

        it("should reject empty path", () => {
            const result = validator.validateSync("")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path is empty")
        })

        it("should reject whitespace-only path", () => {
            const result = validator.validateSync("   ")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path is empty")
        })

        it("should reject path with .. traversal", () => {
            const result = validator.validateSync("../outside")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path contains traversal patterns")
        })

        it("should reject path with embedded .. traversal", () => {
            const result = validator.validateSync("src/../../../etc/passwd")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path contains traversal patterns")
        })

        it("should reject path starting with tilde", () => {
            const result = validator.validateSync("~/secret/file")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path contains traversal patterns")
        })

        it("should reject absolute path outside project", () => {
            const result = validator.validateSync("/etc/passwd")
            expect(result.status).toBe("outside_project")
            expect(result.reason).toBe("Path is outside project root")
        })

        it("should accept absolute path inside project", () => {
            const absoluteInside = path.join(projectRoot, "src/file.ts")
            const result = validator.validateSync(absoluteInside)
            expect(result.status).toBe("valid")
        })

        it("should trim whitespace from path", () => {
            const result = validator.validateSync("  src/file.ts  ")
            expect(result.status).toBe("valid")
        })

        it("should handle Windows-style backslashes", () => {
            const result = validator.validateSync("src\\components\\file.ts")
            expect(result.status).toBe("valid")
        })

        it("should reject path that resolves outside via symlink-like patterns", () => {
            const result = validator.validateSync("src/./../../etc")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path contains traversal patterns")
        })
    })

    describe("validate (async)", () => {
        beforeEach(async () => {
            await fs.mkdir(path.join(projectRoot, "src"), { recursive: true })
            await fs.writeFile(path.join(projectRoot, "src/file.ts"), "// content")
            await fs.mkdir(path.join(projectRoot, "dist"), { recursive: true })
        })

        it("should validate existing file", async () => {
            const result = await validator.validate("src/file.ts")
            expect(result.status).toBe("valid")
        })

        it("should reject non-existent file by default", async () => {
            const result = await validator.validate("src/nonexistent.ts")
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path does not exist")
        })

        it("should allow non-existent file with allowNonExistent option", async () => {
            const result = await validator.validate("src/newfile.ts", { allowNonExistent: true })
            expect(result.status).toBe("valid")
        })

        it("should validate directory when requireDirectory is true", async () => {
            const result = await validator.validate("src", { requireDirectory: true })
            expect(result.status).toBe("valid")
        })

        it("should reject file when requireDirectory is true", async () => {
            const result = await validator.validate("src/file.ts", { requireDirectory: true })
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path is not a directory")
        })

        it("should validate file when requireFile is true", async () => {
            const result = await validator.validate("src/file.ts", { requireFile: true })
            expect(result.status).toBe("valid")
        })

        it("should reject directory when requireFile is true", async () => {
            const result = await validator.validate("src", { requireFile: true })
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path is not a file")
        })

        it("should handle permission errors gracefully", async () => {
            const result = await validator.validate("src/../../../root/secret")
            expect(result.status).toBe("invalid")
        })

        it("should still check traversal before existence", async () => {
            const result = await validator.validate("../outside", { allowNonExistent: true })
            expect(result.status).toBe("invalid")
            expect(result.reason).toBe("Path contains traversal patterns")
        })
    })

    describe("isWithin", () => {
        it("should return true for path within project", () => {
            expect(validator.isWithin("src/file.ts")).toBe(true)
        })

        it("should return true for project root itself", () => {
            expect(validator.isWithin(".")).toBe(true)
            expect(validator.isWithin("")).toBe(false)
        })

        it("should return false for path outside project", () => {
            expect(validator.isWithin("/etc/passwd")).toBe(false)
        })

        it("should return false for traversal path", () => {
            expect(validator.isWithin("../outside")).toBe(false)
        })

        it("should return false for empty path", () => {
            expect(validator.isWithin("")).toBe(false)
        })

        it("should return false for tilde path", () => {
            expect(validator.isWithin("~/file")).toBe(false)
        })
    })

    describe("resolve", () => {
        it("should resolve valid relative path to absolute", () => {
            const result = validator.resolve("src/file.ts")
            expect(result).toBe(path.join(projectRoot, "src/file.ts"))
        })

        it("should return null for invalid path", () => {
            expect(validator.resolve("../outside")).toBeNull()
        })

        it("should return null for empty path", () => {
            expect(validator.resolve("")).toBeNull()
        })

        it("should return null for path outside project", () => {
            expect(validator.resolve("/etc/passwd")).toBeNull()
        })
    })

    describe("relativize", () => {
        it("should return relative path for valid input", () => {
            const result = validator.relativize("src/file.ts")
            expect(result).toBe(path.join("src", "file.ts"))
        })

        it("should handle absolute path within project", () => {
            const absolutePath = path.join(projectRoot, "src/file.ts")
            const result = validator.relativize(absolutePath)
            expect(result).toBe(path.join("src", "file.ts"))
        })

        it("should return null for path outside project", () => {
            expect(validator.relativize("/etc/passwd")).toBeNull()
        })

        it("should return null for traversal path", () => {
            expect(validator.relativize("../outside")).toBeNull()
        })
    })

    describe("edge cases", () => {
        it("should handle path with multiple slashes", () => {
            const result = validator.validateSync("src///file.ts")
            expect(result.status).toBe("valid")
        })

        it("should handle path with dots in filename", () => {
            const result = validator.validateSync("src/file.test.ts")
            expect(result.status).toBe("valid")
        })

        it("should handle hidden files", () => {
            const result = validator.validateSync(".gitignore")
            expect(result.status).toBe("valid")
        })

        it("should handle hidden directories", () => {
            const result = validator.validateSync(".github/workflows/ci.yml")
            expect(result.status).toBe("valid")
        })

        it("should handle single dot current directory", () => {
            const result = validator.validateSync("./src/file.ts")
            expect(result.status).toBe("valid")
        })

        it("should handle project root as path", () => {
            const result = validator.validateSync(projectRoot)
            expect(result.status).toBe("valid")
        })

        it("should handle unicode characters in path", () => {
            const result = validator.validateSync("src/файл.ts")
            expect(result.status).toBe("valid")
        })

        it("should handle spaces in path", () => {
            const result = validator.validateSync("src/my file.ts")
            expect(result.status).toBe("valid")
        })
    })
})

describe("createPathValidator", () => {
    it("should create PathValidator instance", () => {
        const validator = createPathValidator("/tmp/project")
        expect(validator).toBeInstanceOf(PathValidator)
        expect(validator.getProjectRoot()).toBe("/tmp/project")
    })
})

describe("validatePath", () => {
    let tempDir: string
    let projectRoot: string

    beforeEach(async () => {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "validatepath-test-"))
        projectRoot = path.join(tempDir, "project")
        await fs.mkdir(projectRoot)
    })

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true })
    })

    it("should return true for valid path", () => {
        expect(validatePath("src/file.ts", projectRoot)).toBe(true)
    })

    it("should return false for traversal path", () => {
        expect(validatePath("../outside", projectRoot)).toBe(false)
    })

    it("should return false for path outside project", () => {
        expect(validatePath("/etc/passwd", projectRoot)).toBe(false)
    })

    it("should return false for empty path", () => {
        expect(validatePath("", projectRoot)).toBe(false)
    })
})
