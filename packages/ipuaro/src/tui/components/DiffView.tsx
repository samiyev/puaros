/**
 * DiffView component for TUI.
 * Displays inline diff with green (added) and red (removed) highlighting.
 */

import { Box, Text } from "ink"
import type React from "react"
import { detectLanguage, highlightLine, type Language } from "../utils/syntax-highlighter.js"

export interface DiffViewProps {
    filePath: string
    oldLines: string[]
    newLines: string[]
    startLine: number
    language?: Language
    syntaxHighlight?: boolean
}

interface DiffLine {
    type: "add" | "remove" | "context"
    content: string
    lineNumber?: number
}

function computeDiff(oldLines: string[], newLines: string[], startLine: number): DiffLine[] {
    const result: DiffLine[] = []

    let oldIdx = 0
    let newIdx = 0

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
        const oldLine = oldIdx < oldLines.length ? oldLines[oldIdx] : undefined
        const newLine = newIdx < newLines.length ? newLines[newIdx] : undefined

        if (oldLine === newLine) {
            result.push({
                type: "context",
                content: oldLine ?? "",
                lineNumber: startLine + newIdx,
            })
            oldIdx++
            newIdx++
        } else {
            if (oldLine !== undefined) {
                result.push({
                    type: "remove",
                    content: oldLine,
                })
                oldIdx++
            }
            if (newLine !== undefined) {
                result.push({
                    type: "add",
                    content: newLine,
                    lineNumber: startLine + newIdx,
                })
                newIdx++
            }
        }
    }

    return result
}

function getLinePrefix(line: DiffLine): string {
    switch (line.type) {
        case "add": {
            return "+"
        }
        case "remove": {
            return "-"
        }
        case "context": {
            return " "
        }
    }
}

function getLineColor(line: DiffLine): string {
    switch (line.type) {
        case "add": {
            return "green"
        }
        case "remove": {
            return "red"
        }
        case "context": {
            return "gray"
        }
    }
}

function formatLineNumber(num: number | undefined, width: number): string {
    if (num === undefined) {
        return " ".repeat(width)
    }
    return String(num).padStart(width, " ")
}

function DiffLine({
    line,
    lineNumberWidth,
    language,
    syntaxHighlight,
}: {
    line: DiffLine
    lineNumberWidth: number
    language?: Language
    syntaxHighlight?: boolean
}): React.JSX.Element {
    const prefix = getLinePrefix(line)
    const color = getLineColor(line)
    const lineNum = formatLineNumber(line.lineNumber, lineNumberWidth)

    const shouldHighlight = syntaxHighlight && language && line.type === "add"

    return (
        <Box>
            <Text color="gray">{lineNum} </Text>
            {shouldHighlight ? (
                <Box>
                    <Text color={color}>{prefix} </Text>
                    {highlightLine(line.content, language).map((token, idx) => (
                        <Text key={idx} color={token.color}>
                            {token.text}
                        </Text>
                    ))}
                </Box>
            ) : (
                <Text color={color}>
                    {prefix} {line.content}
                </Text>
            )}
        </Box>
    )
}

function DiffHeader({
    filePath,
    startLine,
    endLine,
}: {
    filePath: string
    startLine: number
    endLine: number
}): React.JSX.Element {
    const lineRange =
        startLine === endLine
            ? `line ${String(startLine)}`
            : `lines ${String(startLine)}-${String(endLine)}`

    return (
        <Box>
            <Text color="gray">┌─── </Text>
            <Text color="cyan">{filePath}</Text>
            <Text color="gray"> ({lineRange}) ───┐</Text>
        </Box>
    )
}

function DiffFooter(): React.JSX.Element {
    return (
        <Box>
            <Text color="gray">└───────────────────────────────────────┘</Text>
        </Box>
    )
}

function DiffStats({
    additions,
    deletions,
}: {
    additions: number
    deletions: number
}): React.JSX.Element {
    return (
        <Box gap={1} marginTop={1}>
            <Text color="green">+{String(additions)}</Text>
            <Text color="red">-{String(deletions)}</Text>
        </Box>
    )
}

export function DiffView({
    filePath,
    oldLines,
    newLines,
    startLine,
    language,
    syntaxHighlight = false,
}: DiffViewProps): React.JSX.Element {
    const diffLines = computeDiff(oldLines, newLines, startLine)
    const endLine = startLine + newLines.length - 1
    const lineNumberWidth = String(endLine).length

    const additions = diffLines.filter((l) => l.type === "add").length
    const deletions = diffLines.filter((l) => l.type === "remove").length

    const detectedLanguage = language ?? detectLanguage(filePath)

    return (
        <Box flexDirection="column" paddingX={1}>
            <DiffHeader filePath={filePath} startLine={startLine} endLine={endLine} />
            <Box flexDirection="column" paddingX={1}>
                {diffLines.map((line, index) => (
                    <DiffLine
                        key={`${line.type}-${String(index)}`}
                        line={line}
                        lineNumberWidth={lineNumberWidth}
                        language={detectedLanguage}
                        syntaxHighlight={syntaxHighlight}
                    />
                ))}
            </Box>
            <DiffFooter />
            <DiffStats additions={additions} deletions={deletions} />
        </Box>
    )
}
