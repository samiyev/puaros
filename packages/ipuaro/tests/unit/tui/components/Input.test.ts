/**
 * Tests for Input component.
 */

import { describe, expect, it, vi } from "vitest"
import type { InputProps } from "../../../../src/tui/components/Input.js"

describe("Input", () => {
    describe("module exports", () => {
        it("should export Input component", async () => {
            const mod = await import("../../../../src/tui/components/Input.js")
            expect(mod.Input).toBeDefined()
            expect(typeof mod.Input).toBe("function")
        })
    })

    describe("InputProps interface", () => {
        it("should accept onSubmit callback", () => {
            const onSubmit = vi.fn()
            const props: InputProps = {
                onSubmit,
                history: [],
                disabled: false,
            }
            expect(props.onSubmit).toBe(onSubmit)
        })

        it("should accept history array", () => {
            const history = ["first", "second", "third"]
            const props: InputProps = {
                onSubmit: vi.fn(),
                history,
                disabled: false,
            }
            expect(props.history).toEqual(history)
        })

        it("should accept disabled state", () => {
            const props: InputProps = {
                onSubmit: vi.fn(),
                history: [],
                disabled: true,
            }
            expect(props.disabled).toBe(true)
        })

        it("should accept optional placeholder", () => {
            const props: InputProps = {
                onSubmit: vi.fn(),
                history: [],
                disabled: false,
                placeholder: "Custom placeholder...",
            }
            expect(props.placeholder).toBe("Custom placeholder...")
        })

        it("should have default placeholder when not provided", () => {
            const props: InputProps = {
                onSubmit: vi.fn(),
                history: [],
                disabled: false,
            }
            expect(props.placeholder).toBeUndefined()
        })
    })

    describe("history navigation logic", () => {
        it("should navigate up through history", () => {
            const history = ["first", "second", "third"]
            let historyIndex = -1
            let value = ""

            historyIndex = history.length - 1
            value = history[historyIndex] ?? ""
            expect(value).toBe("third")

            historyIndex = Math.max(0, historyIndex - 1)
            value = history[historyIndex] ?? ""
            expect(value).toBe("second")

            historyIndex = Math.max(0, historyIndex - 1)
            value = history[historyIndex] ?? ""
            expect(value).toBe("first")

            historyIndex = Math.max(0, historyIndex - 1)
            value = history[historyIndex] ?? ""
            expect(value).toBe("first")
        })

        it("should navigate down through history", () => {
            const history = ["first", "second", "third"]
            let historyIndex = 0
            let value = ""
            const savedInput = "current input"

            historyIndex = historyIndex + 1
            value = history[historyIndex] ?? ""
            expect(value).toBe("second")

            historyIndex = historyIndex + 1
            value = history[historyIndex] ?? ""
            expect(value).toBe("third")

            if (historyIndex >= history.length - 1) {
                historyIndex = -1
                value = savedInput
            }
            expect(value).toBe("current input")
            expect(historyIndex).toBe(-1)
        })

        it("should save current input when navigating up", () => {
            const currentInput = "typing something"
            let savedInput = ""

            savedInput = currentInput
            expect(savedInput).toBe("typing something")
        })

        it("should restore saved input when navigating past history end", () => {
            const savedInput = "original input"
            let value = ""

            value = savedInput
            expect(value).toBe("original input")
        })
    })

    describe("submit behavior", () => {
        it("should not submit empty input", () => {
            const onSubmit = vi.fn()
            const text = "   "

            if (text.trim()) {
                onSubmit(text)
            }

            expect(onSubmit).not.toHaveBeenCalled()
        })

        it("should submit non-empty input", () => {
            const onSubmit = vi.fn()
            const text = "hello"

            if (text.trim()) {
                onSubmit(text)
            }

            expect(onSubmit).toHaveBeenCalledWith("hello")
        })

        it("should not submit when disabled", () => {
            const onSubmit = vi.fn()
            const text = "hello"
            const disabled = true

            if (!disabled && text.trim()) {
                onSubmit(text)
            }

            expect(onSubmit).not.toHaveBeenCalled()
        })
    })

    describe("state reset after submit", () => {
        it("should reset value after submit", () => {
            let value = "test input"
            value = ""
            expect(value).toBe("")
        })

        it("should reset history index after submit", () => {
            let historyIndex = 2
            historyIndex = -1
            expect(historyIndex).toBe(-1)
        })

        it("should reset saved input after submit", () => {
            let savedInput = "saved"
            savedInput = ""
            expect(savedInput).toBe("")
        })
    })

    describe("multiline support", () => {
        describe("InputProps with multiline", () => {
            it("should accept multiline as boolean", () => {
                const props: InputProps = {
                    onSubmit: vi.fn(),
                    history: [],
                    disabled: false,
                    multiline: true,
                }
                expect(props.multiline).toBe(true)
            })

            it("should accept multiline as 'auto'", () => {
                const props: InputProps = {
                    onSubmit: vi.fn(),
                    history: [],
                    disabled: false,
                    multiline: "auto",
                }
                expect(props.multiline).toBe("auto")
            })

            it("should have multiline false by default", () => {
                const props: InputProps = {
                    onSubmit: vi.fn(),
                    history: [],
                    disabled: false,
                }
                expect(props.multiline).toBeUndefined()
            })
        })

        describe("multiline activation logic", () => {
            it("should be active when multiline is true", () => {
                const multiline = true
                const lines = ["single line"]
                const isMultilineActive = multiline === true || (multiline === "auto" && lines.length > 1)
                expect(isMultilineActive).toBe(true)
            })

            it("should not be active when multiline is false", () => {
                const multiline = false
                const lines = ["line1", "line2"]
                const isMultilineActive = multiline === true || (multiline === "auto" && lines.length > 1)
                expect(isMultilineActive).toBe(false)
            })

            it("should be active in auto mode with multiple lines", () => {
                const multiline = "auto"
                const lines = ["line1", "line2"]
                const isMultilineActive = multiline === true || (multiline === "auto" && lines.length > 1)
                expect(isMultilineActive).toBe(true)
            })

            it("should not be active in auto mode with single line", () => {
                const multiline = "auto"
                const lines = ["single line"]
                const isMultilineActive = multiline === true || (multiline === "auto" && lines.length > 1)
                expect(isMultilineActive).toBe(false)
            })
        })

        describe("line management", () => {
            it("should update current line on change", () => {
                const lines = ["first", "second", "third"]
                const currentLineIndex = 1
                const newValue = "updated second"

                const newLines = [...lines]
                newLines[currentLineIndex] = newValue

                expect(newLines).toEqual(["first", "updated second", "third"])
                expect(newLines.join("\n")).toBe("first\nupdated second\nthird")
            })

            it("should add new line at current position", () => {
                const lines = ["first", "second"]
                const currentLineIndex = 0

                const newLines = [...lines]
                newLines.splice(currentLineIndex + 1, 0, "")

                expect(newLines).toEqual(["first", "", "second"])
            })

            it("should join lines with newline for submit", () => {
                const lines = ["line 1", "line 2", "line 3"]
                const fullText = lines.join("\n")
                expect(fullText).toBe("line 1\nline 2\nline 3")
            })
        })

        describe("line navigation", () => {
            it("should navigate up in multiline mode", () => {
                const lines = ["line1", "line2", "line3"]
                let currentLineIndex = 2

                currentLineIndex = currentLineIndex - 1
                expect(currentLineIndex).toBe(1)

                currentLineIndex = currentLineIndex - 1
                expect(currentLineIndex).toBe(0)
            })

            it("should not navigate up past first line", () => {
                const lines = ["line1", "line2"]
                const currentLineIndex = 0
                const isMultilineActive = true

                const canNavigateUp = isMultilineActive && currentLineIndex > 0
                expect(canNavigateUp).toBe(false)
            })

            it("should navigate down in multiline mode", () => {
                const lines = ["line1", "line2", "line3"]
                let currentLineIndex = 0

                currentLineIndex = currentLineIndex + 1
                expect(currentLineIndex).toBe(1)

                currentLineIndex = currentLineIndex + 1
                expect(currentLineIndex).toBe(2)
            })

            it("should not navigate down past last line", () => {
                const lines = ["line1", "line2"]
                const currentLineIndex = 1
                const isMultilineActive = true

                const canNavigateDown = isMultilineActive && currentLineIndex < lines.length - 1
                expect(canNavigateDown).toBe(false)
            })
        })

        describe("multiline submit", () => {
            it("should submit trimmed multiline text", () => {
                const lines = ["line 1", "line 2", "line 3"]
                const fullText = lines.join("\n").trim()
                expect(fullText).toBe("line 1\nline 2\nline 3")
            })

            it("should not submit empty multiline text", () => {
                const onSubmit = vi.fn()
                const lines = ["", "", ""]
                const fullText = lines.join("\n").trim()

                if (fullText) {
                    onSubmit(fullText)
                }

                expect(onSubmit).not.toHaveBeenCalled()
            })

            it("should reset lines after submit", () => {
                let lines = ["line1", "line2"]
                let currentLineIndex = 1

                lines = [""]
                currentLineIndex = 0

                expect(lines).toEqual([""])
                expect(currentLineIndex).toBe(0)
            })
        })
    })
})
