/**
 * EditableContent component for TUI.
 * Displays editable multi-line text with line-by-line navigation.
 */

import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import React, { useCallback, useState } from "react"

export interface EditableContentProps {
    /** Initial lines to edit */
    lines: string[]
    /** Called when user finishes editing (Enter key) */
    onSubmit: (editedLines: string[]) => void
    /** Called when user cancels editing (Escape key) */
    onCancel: () => void
    /** Maximum visible lines before scrolling */
    maxVisibleLines?: number
}

/**
 * EditableContent component.
 * Allows line-by-line editing of multi-line text.
 * - Up/Down: Navigate between lines
 * - Enter (on last line): Submit changes
 * - Ctrl+Enter: Submit changes from any line
 * - Escape: Cancel editing
 */
export function EditableContent({
    lines: initialLines,
    onSubmit,
    onCancel,
    maxVisibleLines = 20,
}: EditableContentProps): React.JSX.Element {
    const [lines, setLines] = useState<string[]>(initialLines.length > 0 ? initialLines : [""])
    const [currentLineIndex, setCurrentLineIndex] = useState(0)
    const [currentLineValue, setCurrentLineValue] = useState(lines[0] ?? "")

    const updateCurrentLine = useCallback(
        (value: string) => {
            const newLines = [...lines]
            newLines[currentLineIndex] = value
            setLines(newLines)
            setCurrentLineValue(value)
        },
        [lines, currentLineIndex],
    )

    const handleLineSubmit = useCallback(() => {
        updateCurrentLine(currentLineValue)

        if (currentLineIndex === lines.length - 1) {
            onSubmit(lines)
        } else {
            const nextIndex = currentLineIndex + 1
            setCurrentLineIndex(nextIndex)
            setCurrentLineValue(lines[nextIndex] ?? "")
        }
    }, [currentLineValue, currentLineIndex, lines, updateCurrentLine, onSubmit])

    const handleMoveUp = useCallback(() => {
        if (currentLineIndex > 0) {
            updateCurrentLine(currentLineValue)
            const prevIndex = currentLineIndex - 1
            setCurrentLineIndex(prevIndex)
            setCurrentLineValue(lines[prevIndex] ?? "")
        }
    }, [currentLineIndex, currentLineValue, lines, updateCurrentLine])

    const handleMoveDown = useCallback(() => {
        if (currentLineIndex < lines.length - 1) {
            updateCurrentLine(currentLineValue)
            const nextIndex = currentLineIndex + 1
            setCurrentLineIndex(nextIndex)
            setCurrentLineValue(lines[nextIndex] ?? "")
        }
    }, [currentLineIndex, currentLineValue, lines, updateCurrentLine])

    const handleCtrlEnter = useCallback(() => {
        updateCurrentLine(currentLineValue)
        onSubmit(lines)
    }, [currentLineValue, lines, updateCurrentLine, onSubmit])

    useInput(
        (input, key) => {
            if (key.escape) {
                onCancel()
            } else if (key.upArrow) {
                handleMoveUp()
            } else if (key.downArrow) {
                handleMoveDown()
            } else if (key.ctrl && key.return) {
                handleCtrlEnter()
            }
        },
        { isActive: true },
    )

    const startLine = Math.max(0, currentLineIndex - Math.floor(maxVisibleLines / 2))
    const endLine = Math.min(lines.length, startLine + maxVisibleLines)
    const visibleLines = lines.slice(startLine, endLine)

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            <Box marginBottom={1}>
                <Text color="cyan" bold>
                    Edit Content (Line {currentLineIndex + 1}/{lines.length})
                </Text>
            </Box>

            <Box flexDirection="column" marginBottom={1}>
                {visibleLines.map((line, idx) => {
                    const actualIndex = startLine + idx
                    const isCurrentLine = actualIndex === currentLineIndex

                    return (
                        <Box key={actualIndex}>
                            <Text color="gray" dimColor>
                                {String(actualIndex + 1).padStart(3, " ")}:{" "}
                            </Text>
                            {isCurrentLine ? (
                                <Box>
                                    <Text color="cyan">▶ </Text>
                                    <TextInput
                                        value={currentLineValue}
                                        onChange={setCurrentLineValue}
                                        onSubmit={handleLineSubmit}
                                    />
                                </Box>
                            ) : (
                                <Text color={isCurrentLine ? "cyan" : "white"}>{line}</Text>
                            )}
                        </Box>
                    )
                })}
            </Box>

            <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1}>
                <Text dimColor>↑/↓: Navigate lines</Text>
                <Text dimColor>Enter: Next line / Submit (last line)</Text>
                <Text dimColor>Ctrl+Enter: Submit from any line</Text>
                <Text dimColor>Escape: Cancel</Text>
            </Box>
        </Box>
    )
}
