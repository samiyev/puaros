/**
 * Main TUI App component.
 * Orchestrates the terminal user interface.
 */

import { Box, Text, useApp } from "ink"
import React, { useCallback, useEffect, useState } from "react"
import type { ILLMClient } from "../domain/services/ILLMClient.js"
import type { ISessionStorage } from "../domain/services/ISessionStorage.js"
import type { IStorage } from "../domain/services/IStorage.js"
import type { DiffInfo } from "../domain/services/ITool.js"
import type { ErrorOption } from "../shared/errors/IpuaroError.js"
import type { IToolRegistry } from "../application/interfaces/IToolRegistry.js"
import type { ConfirmationResult } from "../application/use-cases/ExecuteTool.js"
import type { ProjectStructure } from "../infrastructure/llm/prompts.js"
import { Chat, ConfirmDialog, Input, StatusBar } from "./components/index.js"
import { type CommandResult, useCommands, useHotkeys, useSession } from "./hooks/index.js"
import type { AppProps, BranchInfo } from "./types.js"
import type { ConfirmChoice } from "../shared/types/index.js"

export interface AppDependencies {
    storage: IStorage
    sessionStorage: ISessionStorage
    llm: ILLMClient
    tools: IToolRegistry
    projectStructure?: ProjectStructure
}

export interface ExtendedAppProps extends AppProps {
    deps: AppDependencies
    onExit?: () => void
}

function LoadingScreen(): React.JSX.Element {
    return (
        <Box flexDirection="column" padding={1}>
            <Text color="cyan">Loading session...</Text>
        </Box>
    )
}

function ErrorScreen({ error }: { error: Error }): React.JSX.Element {
    return (
        <Box flexDirection="column" padding={1}>
            <Text color="red" bold>
                Error
            </Text>
            <Text color="red">{error.message}</Text>
        </Box>
    )
}

async function handleErrorDefault(_error: Error): Promise<ErrorOption> {
    return Promise.resolve("skip")
}

interface PendingConfirmation {
    message: string
    diff?: DiffInfo
    resolve: (result: boolean | ConfirmationResult) => void
}

export function App({
    projectPath,
    autoApply: initialAutoApply = false,
    deps,
    onExit,
}: ExtendedAppProps): React.JSX.Element {
    const { exit } = useApp()

    const [branch] = useState<BranchInfo>({ name: "main", isDetached: false })
    const [sessionTime, setSessionTime] = useState("0m")
    const [autoApply, setAutoApply] = useState(initialAutoApply)
    const [commandResult, setCommandResult] = useState<CommandResult | null>(null)
    const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)

    const projectName = projectPath.split("/").pop() ?? "unknown"

    const handleConfirmation = useCallback(
        async (message: string, diff?: DiffInfo): Promise<boolean | ConfirmationResult> => {
            return new Promise((resolve) => {
                setPendingConfirmation({ message, diff, resolve })
            })
        },
        [],
    )

    const handleConfirmSelect = useCallback(
        (choice: ConfirmChoice, editedContent?: string[]) => {
            if (!pendingConfirmation) {
                return
            }

            if (choice === "apply") {
                if (editedContent) {
                    pendingConfirmation.resolve({ confirmed: true, editedContent })
                } else {
                    pendingConfirmation.resolve(true)
                }
            } else {
                pendingConfirmation.resolve(false)
            }

            setPendingConfirmation(null)
        },
        [pendingConfirmation],
    )

    const { session, messages, status, isLoading, error, sendMessage, undo, clearHistory, abort } =
        useSession(
            {
                storage: deps.storage,
                sessionStorage: deps.sessionStorage,
                llm: deps.llm,
                tools: deps.tools,
                projectRoot: projectPath,
                projectName,
                projectStructure: deps.projectStructure,
            },
            {
                autoApply,
                onConfirmation: handleConfirmation,
                onError: handleErrorDefault,
            },
        )

    const reindex = useCallback(async (): Promise<void> => {
        const { IndexProject } = await import("../application/use-cases/IndexProject.js")
        const indexProject = new IndexProject(deps.storage, projectPath)
        await indexProject.execute(projectPath)
    }, [deps.storage, projectPath])

    const { executeCommand, isCommand } = useCommands(
        {
            session,
            sessionStorage: deps.sessionStorage,
            storage: deps.storage,
            llm: deps.llm,
            tools: deps.tools,
            projectRoot: projectPath,
            projectName,
        },
        {
            clearHistory,
            undo,
            setAutoApply,
            reindex,
        },
        { autoApply },
    )

    const handleExit = useCallback((): void => {
        onExit?.()
        exit()
    }, [exit, onExit])

    const handleInterrupt = useCallback((): void => {
        if (status === "thinking" || status === "tool_call") {
            abort()
        }
    }, [status, abort])

    const handleUndo = useCallback((): void => {
        void undo()
    }, [undo])

    useHotkeys(
        {
            onInterrupt: handleInterrupt,
            onExit: handleExit,
            onUndo: handleUndo,
        },
        { enabled: !isLoading },
    )

    useEffect(() => {
        if (!session) {
            return
        }

        const interval = setInterval(() => {
            setSessionTime(session.getSessionDurationFormatted())
        }, 60_000)

        setSessionTime(session.getSessionDurationFormatted())

        return (): void => {
            clearInterval(interval)
        }
    }, [session])

    const handleSubmit = useCallback(
        (text: string): void => {
            if (isCommand(text)) {
                void executeCommand(text).then((result) => {
                    setCommandResult(result)
                    // Auto-clear command result after 5 seconds
                    setTimeout(() => {
                        setCommandResult(null)
                    }, 5000)
                })
                return
            }
            void sendMessage(text)
        },
        [sendMessage, isCommand, executeCommand],
    )

    if (isLoading) {
        return <LoadingScreen />
    }

    if (error) {
        return <ErrorScreen error={error} />
    }

    const isInputDisabled = status === "thinking" || status === "tool_call" || !!pendingConfirmation

    return (
        <Box flexDirection="column" height="100%">
            <StatusBar
                contextUsage={session?.context.tokenUsage ?? 0}
                projectName={projectName}
                branch={branch}
                sessionTime={sessionTime}
                status={status}
            />
            <Chat messages={messages} isThinking={status === "thinking"} />
            {commandResult && (
                <Box
                    borderStyle="round"
                    borderColor={commandResult.success ? "green" : "red"}
                    paddingX={1}
                    marginY={1}
                >
                    <Text color={commandResult.success ? "green" : "red"} wrap="wrap">
                        {commandResult.message}
                    </Text>
                </Box>
            )}
            {pendingConfirmation && (
                <ConfirmDialog
                    message={pendingConfirmation.message}
                    diff={
                        pendingConfirmation.diff
                            ? {
                                  filePath: pendingConfirmation.diff.filePath,
                                  oldLines: pendingConfirmation.diff.oldLines,
                                  newLines: pendingConfirmation.diff.newLines,
                                  startLine: pendingConfirmation.diff.startLine,
                              }
                            : undefined
                    }
                    onSelect={handleConfirmSelect}
                    editableContent={pendingConfirmation.diff?.newLines}
                />
            )}
            <Input
                onSubmit={handleSubmit}
                history={session?.inputHistory ?? []}
                disabled={isInputDisabled}
                placeholder={isInputDisabled ? "Processing..." : "Type a message..."}
                storage={deps.storage}
                projectRoot={projectPath}
                autocompleteEnabled={true}
            />
        </Box>
    )
}
