/**
 * ErrorDialog component for TUI.
 * Displays an error with [R] Retry / [S] Skip / [A] Abort options.
 */

import { Box, Text, useInput } from "ink"
import React, { useState } from "react"
import type { ErrorOption } from "../../shared/errors/IpuaroError.js"

export interface ErrorInfo {
    type: string
    message: string
    recoverable: boolean
}

export interface ErrorDialogProps {
    error: ErrorInfo
    onChoice: (choice: ErrorOption) => void
}

function ChoiceButton({
    hotkey,
    label,
    isSelected,
    disabled,
}: {
    hotkey: string
    label: string
    isSelected: boolean
    disabled?: boolean
}): React.JSX.Element {
    if (disabled) {
        return (
            <Box>
                <Text color="gray" dimColor>
                    [{hotkey}] {label}
                </Text>
            </Box>
        )
    }

    return (
        <Box>
            <Text color={isSelected ? "cyan" : "gray"}>
                [<Text bold>{hotkey}</Text>] {label}
            </Text>
        </Box>
    )
}

export function ErrorDialog({ error, onChoice }: ErrorDialogProps): React.JSX.Element {
    const [selected, setSelected] = useState<ErrorOption | null>(null)

    useInput((input, key) => {
        const lowerInput = input.toLowerCase()

        if (lowerInput === "r" && error.recoverable) {
            setSelected("retry")
            onChoice("retry")
        } else if (lowerInput === "s" && error.recoverable) {
            setSelected("skip")
            onChoice("skip")
        } else if (lowerInput === "a") {
            setSelected("abort")
            onChoice("abort")
        } else if (key.escape) {
            setSelected("abort")
            onChoice("abort")
        }
    })

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1} paddingY={1}>
            <Box marginBottom={1}>
                <Text color="red" bold>
                    x {error.type}: {error.message}
                </Text>
            </Box>

            <Box gap={2}>
                <ChoiceButton
                    hotkey="R"
                    label="Retry"
                    isSelected={selected === "retry"}
                    disabled={!error.recoverable}
                />
                <ChoiceButton
                    hotkey="S"
                    label="Skip"
                    isSelected={selected === "skip"}
                    disabled={!error.recoverable}
                />
                <ChoiceButton hotkey="A" label="Abort" isSelected={selected === "abort"} />
            </Box>

            {!error.recoverable && (
                <Box marginTop={1}>
                    <Text color="gray" dimColor>
                        This error is not recoverable. Press [A] to abort.
                    </Text>
                </Box>
            )}
        </Box>
    )
}
