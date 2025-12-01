/**
 * Input component for TUI.
 * Prompt with history navigation (up/down) and path autocomplete (tab).
 */

import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import React, { useCallback, useState } from "react"
import type { IStorage } from "../../domain/services/IStorage.js"
import { useAutocomplete } from "../hooks/useAutocomplete.js"

export interface InputProps {
    onSubmit: (text: string) => void
    history: string[]
    disabled: boolean
    placeholder?: string
    storage?: IStorage
    projectRoot?: string
    autocompleteEnabled?: boolean
    multiline?: boolean | "auto"
}

export function Input({
    onSubmit,
    history,
    disabled,
    placeholder = "Type a message...",
    storage,
    projectRoot = "",
    autocompleteEnabled = true,
    multiline = false,
}: InputProps): React.JSX.Element {
    const [value, setValue] = useState("")
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [savedInput, setSavedInput] = useState("")
    const [lines, setLines] = useState<string[]>([""])
    const [currentLineIndex, setCurrentLineIndex] = useState(0)

    const isMultilineActive = multiline === true || (multiline === "auto" && lines.length > 1)

    /*
     * Initialize autocomplete hook if storage is provided
     * Create a dummy storage object if storage is not provided (autocomplete will be disabled)
     */
    const dummyStorage = {} as IStorage
    const autocomplete = useAutocomplete({
        storage: storage ?? dummyStorage,
        projectRoot,
        enabled: autocompleteEnabled && !!storage,
    })

    const handleChange = useCallback(
        (newValue: string) => {
            setValue(newValue)
            setHistoryIndex(-1)
            // Update autocomplete suggestions as user types
            if (storage && autocompleteEnabled) {
                autocomplete.complete(newValue)
            }
        },
        [storage, autocompleteEnabled, autocomplete],
    )

    const handleSubmit = useCallback(
        (text: string) => {
            if (disabled || !text.trim()) {
                return
            }
            onSubmit(text)
            setValue("")
            setLines([""])
            setCurrentLineIndex(0)
            setHistoryIndex(-1)
            setSavedInput("")
            autocomplete.reset()
        },
        [disabled, onSubmit, autocomplete],
    )

    const handleLineChange = useCallback(
        (newValue: string) => {
            const newLines = [...lines]
            newLines[currentLineIndex] = newValue
            setLines(newLines)
            setValue(newLines.join("\n"))
        },
        [lines, currentLineIndex],
    )

    const handleAddLine = useCallback(() => {
        const newLines = [...lines]
        newLines.splice(currentLineIndex + 1, 0, "")
        setLines(newLines)
        setCurrentLineIndex(currentLineIndex + 1)
        setValue(newLines.join("\n"))
    }, [lines, currentLineIndex])

    const handleMultilineSubmit = useCallback(() => {
        const fullText = lines.join("\n").trim()
        if (fullText) {
            handleSubmit(fullText)
        }
    }, [lines, handleSubmit])

    const handleTabKey = useCallback(() => {
        if (storage && autocompleteEnabled && value.trim()) {
            const suggestions = autocomplete.suggestions
            if (suggestions.length > 0) {
                const completed = autocomplete.accept(value)
                setValue(completed)
                autocomplete.complete(completed)
            }
        }
    }, [storage, autocompleteEnabled, value, autocomplete])

    const handleUpArrow = useCallback(() => {
        if (history.length > 0) {
            if (historyIndex === -1) {
                setSavedInput(value)
            }
            const newIndex =
                historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1)
            setHistoryIndex(newIndex)
            setValue(history[newIndex] ?? "")
            autocomplete.reset()
        }
    }, [history, historyIndex, value, autocomplete])

    const handleDownArrow = useCallback(() => {
        if (historyIndex === -1) {
            return
        }
        if (historyIndex >= history.length - 1) {
            setHistoryIndex(-1)
            setValue(savedInput)
        } else {
            const newIndex = historyIndex + 1
            setHistoryIndex(newIndex)
            setValue(history[newIndex] ?? "")
        }
        autocomplete.reset()
    }, [historyIndex, history, savedInput, autocomplete])

    useInput(
        (input, key) => {
            if (disabled) {
                return
            }
            if (key.tab) {
                handleTabKey()
            }
            if (key.return && key.shift && isMultilineActive) {
                handleAddLine()
            }
            if (key.upArrow) {
                if (isMultilineActive && currentLineIndex > 0) {
                    setCurrentLineIndex(currentLineIndex - 1)
                } else if (!isMultilineActive) {
                    handleUpArrow()
                }
            }
            if (key.downArrow) {
                if (isMultilineActive && currentLineIndex < lines.length - 1) {
                    setCurrentLineIndex(currentLineIndex + 1)
                } else if (!isMultilineActive) {
                    handleDownArrow()
                }
            }
        },
        { isActive: !disabled },
    )

    const hasSuggestions = autocomplete.suggestions.length > 0

    return (
        <Box flexDirection="column">
            <Box
                borderStyle="single"
                borderColor={disabled ? "gray" : "cyan"}
                paddingX={1}
                flexDirection="column"
            >
                {disabled ? (
                    <Box>
                        <Text color="gray" bold>
                            {">"}{" "}
                        </Text>
                        <Text color="gray" dimColor>
                            {placeholder}
                        </Text>
                    </Box>
                ) : isMultilineActive ? (
                    <Box flexDirection="column">
                        {lines.map((line, index) => (
                            <Box key={index}>
                                <Text color="green" bold>
                                    {index === currentLineIndex ? ">" : " "}{" "}
                                </Text>
                                {index === currentLineIndex ? (
                                    <TextInput
                                        value={line}
                                        onChange={handleLineChange}
                                        onSubmit={handleMultilineSubmit}
                                        placeholder={index === 0 ? placeholder : ""}
                                    />
                                ) : (
                                    <Text>{line}</Text>
                                )}
                            </Box>
                        ))}
                        <Box marginTop={1}>
                            <Text dimColor>Shift+Enter: new line | Enter: submit</Text>
                        </Box>
                    </Box>
                ) : (
                    <Box>
                        <Text color="green" bold>
                            {">"}{" "}
                        </Text>
                        <TextInput
                            value={value}
                            onChange={handleChange}
                            onSubmit={handleSubmit}
                            placeholder={placeholder}
                        />
                    </Box>
                )}
            </Box>
            {hasSuggestions && !disabled && (
                <Box paddingLeft={2} flexDirection="column">
                    <Text dimColor>
                        {autocomplete.suggestions.length === 1
                            ? "Press Tab to complete"
                            : `${String(autocomplete.suggestions.length)} suggestions (Tab to complete)`}
                    </Text>
                    {autocomplete.suggestions.slice(0, 5).map((suggestion, i) => (
                        <Text key={i} dimColor color="cyan">
                            {"  "}• {suggestion}
                        </Text>
                    ))}
                    {autocomplete.suggestions.length > 5 && (
                        <Text dimColor>
                            {"  "}... and {String(autocomplete.suggestions.length - 5)} more
                        </Text>
                    )}
                </Box>
            )}
        </Box>
    )
}
