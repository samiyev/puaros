/**
 * ConfirmDialog component for TUI.
 * Displays a confirmation dialog with [Y] Apply / [N] Cancel / [E] Edit options.
 * Supports inline editing when user selects Edit.
 */

import { Box, Text, useInput } from "ink"
import React, { useCallback, useState } from "react"
import type { ConfirmChoice } from "../../shared/types/index.js"
import { DiffView, type DiffViewProps } from "./DiffView.js"
import { EditableContent } from "./EditableContent.js"

export interface ConfirmDialogProps {
    message: string
    diff?: DiffViewProps
    onSelect: (choice: ConfirmChoice, editedContent?: string[]) => void
    editableContent?: string[]
    syntaxHighlight?: boolean
}

type DialogMode = "confirm" | "edit"

function ChoiceButton({
    hotkey,
    label,
    isSelected,
}: {
    hotkey: string
    label: string
    isSelected: boolean
}): React.JSX.Element {
    return (
        <Box>
            <Text color={isSelected ? "cyan" : "gray"}>
                [<Text bold>{hotkey}</Text>] {label}
            </Text>
        </Box>
    )
}

export function ConfirmDialog({
    message,
    diff,
    onSelect,
    editableContent,
    syntaxHighlight = false,
}: ConfirmDialogProps): React.JSX.Element {
    const [mode, setMode] = useState<DialogMode>("confirm")
    const [selected, setSelected] = useState<ConfirmChoice | null>(null)

    const linesToEdit = editableContent ?? diff?.newLines ?? []
    const canEdit = linesToEdit.length > 0

    const handleEditSubmit = useCallback(
        (editedLines: string[]) => {
            setSelected("apply")
            onSelect("apply", editedLines)
        },
        [onSelect],
    )

    const handleEditCancel = useCallback(() => {
        setMode("confirm")
        setSelected(null)
    }, [])

    useInput(
        (input, key) => {
            if (mode === "edit") {
                return
            }

            const lowerInput = input.toLowerCase()

            if (lowerInput === "y") {
                setSelected("apply")
                onSelect("apply")
            } else if (lowerInput === "n") {
                setSelected("cancel")
                onSelect("cancel")
            } else if (lowerInput === "e" && canEdit) {
                setSelected("edit")
                setMode("edit")
            } else if (key.escape) {
                setSelected("cancel")
                onSelect("cancel")
            }
        },
        { isActive: mode === "confirm" },
    )

    if (mode === "edit") {
        return (
            <EditableContent
                lines={linesToEdit}
                onSubmit={handleEditSubmit}
                onCancel={handleEditCancel}
            />
        )
    }

    return (
        <Box
            flexDirection="column"
            borderStyle="round"
            borderColor="yellow"
            paddingX={1}
            paddingY={1}
        >
            <Box marginBottom={1}>
                <Text color="yellow" bold>
                    ⚠ {message}
                </Text>
            </Box>

            {diff && (
                <Box marginBottom={1}>
                    <DiffView {...diff} syntaxHighlight={syntaxHighlight} />
                </Box>
            )}

            <Box gap={2}>
                <ChoiceButton hotkey="Y" label="Apply" isSelected={selected === "apply"} />
                <ChoiceButton hotkey="N" label="Cancel" isSelected={selected === "cancel"} />
                {canEdit ? (
                    <ChoiceButton hotkey="E" label="Edit" isSelected={selected === "edit"} />
                ) : (
                    <Box>
                        <Text color="gray" dimColor>
                            [E] Edit (disabled)
                        </Text>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
