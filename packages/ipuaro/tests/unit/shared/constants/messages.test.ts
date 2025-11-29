import { describe, it, expect } from "vitest"
import { MESSAGES } from "../../../../src/shared/constants/messages.js"

describe("MESSAGES", () => {
    it("should have status messages", () => {
        expect(MESSAGES.STATUS_READY).toBe("Ready")
        expect(MESSAGES.STATUS_THINKING).toBe("Thinking...")
        expect(MESSAGES.STATUS_INDEXING).toBe("Indexing...")
        expect(MESSAGES.STATUS_ERROR).toBe("Error")
    })

    it("should have error messages", () => {
        expect(MESSAGES.ERROR_REDIS_UNAVAILABLE).toContain("Redis")
        expect(MESSAGES.ERROR_OLLAMA_UNAVAILABLE).toContain("Ollama")
        expect(MESSAGES.ERROR_MODEL_NOT_FOUND).toContain("Model")
        expect(MESSAGES.ERROR_FILE_NOT_FOUND).toBe("File not found")
        expect(MESSAGES.ERROR_PARSE_FAILED).toContain("parse")
        expect(MESSAGES.ERROR_TOOL_FAILED).toContain("Tool")
        expect(MESSAGES.ERROR_COMMAND_BLACKLISTED).toContain("blacklisted")
        expect(MESSAGES.ERROR_PATH_OUTSIDE_PROJECT).toContain("outside")
    })

    it("should have confirmation messages", () => {
        expect(MESSAGES.CONFIRM_APPLY_EDIT).toContain("Apply")
        expect(MESSAGES.CONFIRM_DELETE_FILE).toContain("Delete")
        expect(MESSAGES.CONFIRM_RUN_COMMAND).toContain("Run")
        expect(MESSAGES.CONFIRM_CREATE_FILE).toContain("Create")
        expect(MESSAGES.CONFIRM_GIT_COMMIT).toContain("commit")
    })

    it("should have info messages", () => {
        expect(MESSAGES.INFO_SESSION_LOADED).toContain("loaded")
        expect(MESSAGES.INFO_SESSION_CREATED).toContain("created")
        expect(MESSAGES.INFO_INDEXING_COMPLETE).toContain("complete")
        expect(MESSAGES.INFO_EDIT_APPLIED).toContain("applied")
        expect(MESSAGES.INFO_EDIT_CANCELLED).toContain("cancelled")
        expect(MESSAGES.INFO_UNDO_SUCCESS).toContain("reverted")
        expect(MESSAGES.INFO_UNDO_EMPTY).toContain("Nothing")
    })

    it("should have help text", () => {
        expect(MESSAGES.HELP_COMMANDS).toContain("/help")
        expect(MESSAGES.HELP_COMMANDS).toContain("/clear")
        expect(MESSAGES.HELP_COMMANDS).toContain("/undo")
        expect(MESSAGES.HELP_HOTKEYS).toContain("Ctrl+C")
        expect(MESSAGES.HELP_HOTKEYS).toContain("Ctrl+D")
    })
})
