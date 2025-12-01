/**
 * Chat component for TUI.
 * Displays message history with tool calls and stats.
 */

import { Box, Text } from "ink"
import type React from "react"
import type { ChatMessage } from "../../domain/value-objects/ChatMessage.js"
import type { ToolCall } from "../../domain/value-objects/ToolCall.js"
import { getRoleColor, type Theme } from "../utils/theme.js"

export interface ChatProps {
    messages: ChatMessage[]
    isThinking: boolean
    theme?: Theme
    showStats?: boolean
    showToolCalls?: boolean
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    return `${hours}:${minutes}`
}

function formatStats(stats: ChatMessage["stats"]): string {
    if (!stats) {
        return ""
    }
    const time = (stats.timeMs / 1000).toFixed(1)
    const tokens = stats.tokens.toLocaleString()
    const tools = stats.toolCalls

    const parts = [`${time}s`, `${tokens} tokens`]
    if (tools > 0) {
        parts.push(`${String(tools)} tool${tools > 1 ? "s" : ""}`)
    }
    return parts.join(" | ")
}

function formatToolCall(call: ToolCall): string {
    const params = Object.entries(call.params)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(" ")
    return `[${call.name} ${params}]`
}

interface MessageComponentProps {
    message: ChatMessage
    theme: Theme
    showStats: boolean
    showToolCalls: boolean
}

function UserMessage({ message, theme }: MessageComponentProps): React.JSX.Element {
    const roleColor = getRoleColor("user", theme)

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Box gap={1}>
                <Text color={roleColor} bold>
                    You
                </Text>
                <Text color="gray" dimColor>
                    {formatTimestamp(message.timestamp)}
                </Text>
            </Box>
            <Box marginLeft={2}>
                <Text>{message.content}</Text>
            </Box>
        </Box>
    )
}

function AssistantMessage({
    message,
    theme,
    showStats,
    showToolCalls,
}: MessageComponentProps): React.JSX.Element {
    const stats = formatStats(message.stats)
    const roleColor = getRoleColor("assistant", theme)

    return (
        <Box flexDirection="column" marginBottom={1}>
            <Box gap={1}>
                <Text color={roleColor} bold>
                    Assistant
                </Text>
                <Text color="gray" dimColor>
                    {formatTimestamp(message.timestamp)}
                </Text>
            </Box>

            {showToolCalls && message.toolCalls && message.toolCalls.length > 0 && (
                <Box flexDirection="column" marginLeft={2} marginBottom={1}>
                    {message.toolCalls.map((call) => (
                        <Text key={call.id} color="yellow">
                            {formatToolCall(call)}
                        </Text>
                    ))}
                </Box>
            )}

            {message.content && (
                <Box marginLeft={2}>
                    <Text>{message.content}</Text>
                </Box>
            )}

            {showStats && stats && (
                <Box marginLeft={2} marginTop={1}>
                    <Text color="gray" dimColor>
                        {stats}
                    </Text>
                </Box>
            )}
        </Box>
    )
}

function ToolMessage({ message }: MessageComponentProps): React.JSX.Element {
    return (
        <Box flexDirection="column" marginBottom={1} marginLeft={2}>
            {message.toolResults?.map((result) => (
                <Box key={result.callId} flexDirection="column">
                    <Text color={result.success ? "green" : "red"}>
                        {result.success ? "+" : "x"} {result.callId.slice(0, 8)}
                    </Text>
                </Box>
            ))}
        </Box>
    )
}

function SystemMessage({ message, theme }: MessageComponentProps): React.JSX.Element {
    const isError = message.content.toLowerCase().startsWith("error")
    const roleColor = getRoleColor("system", theme)

    return (
        <Box marginBottom={1} marginLeft={2}>
            <Text color={isError ? "red" : roleColor} dimColor={!isError}>
                {message.content}
            </Text>
        </Box>
    )
}

function MessageComponent({
    message,
    theme,
    showStats,
    showToolCalls,
}: MessageComponentProps): React.JSX.Element {
    const props = { message, theme, showStats, showToolCalls }

    switch (message.role) {
        case "user": {
            return <UserMessage {...props} />
        }
        case "assistant": {
            return <AssistantMessage {...props} />
        }
        case "tool": {
            return <ToolMessage {...props} />
        }
        case "system": {
            return <SystemMessage {...props} />
        }
        default: {
            return <></>
        }
    }
}

function ThinkingIndicator({ theme }: { theme: Theme }): React.JSX.Element {
    const color = getRoleColor("assistant", theme)

    return (
        <Box marginBottom={1}>
            <Text color={color}>Thinking...</Text>
        </Box>
    )
}

export function Chat({
    messages,
    isThinking,
    theme = "dark",
    showStats = true,
    showToolCalls = true,
}: ChatProps): React.JSX.Element {
    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
            {messages.map((message, index) => (
                <MessageComponent
                    key={`${String(message.timestamp)}-${String(index)}`}
                    message={message}
                    theme={theme}
                    showStats={showStats}
                    showToolCalls={showToolCalls}
                />
            ))}
            {isThinking && <ThinkingIndicator theme={theme} />}
        </Box>
    )
}
