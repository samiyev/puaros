/**
 * Simple syntax highlighter for terminal UI.
 * Highlights keywords, strings, comments, numbers, and operators.
 */

export type Language = "typescript" | "javascript" | "tsx" | "jsx" | "json" | "yaml" | "unknown"

export interface HighlightedToken {
    text: string
    color: string
}

const KEYWORDS = new Set([
    "abstract",
    "any",
    "as",
    "async",
    "await",
    "boolean",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "constructor",
    "continue",
    "debugger",
    "declare",
    "default",
    "delete",
    "do",
    "else",
    "enum",
    "export",
    "extends",
    "false",
    "finally",
    "for",
    "from",
    "function",
    "get",
    "if",
    "implements",
    "import",
    "in",
    "instanceof",
    "interface",
    "let",
    "module",
    "namespace",
    "new",
    "null",
    "number",
    "of",
    "package",
    "private",
    "protected",
    "public",
    "readonly",
    "require",
    "return",
    "set",
    "static",
    "string",
    "super",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "type",
    "typeof",
    "undefined",
    "var",
    "void",
    "while",
    "with",
    "yield",
])

export function detectLanguage(filePath: string): Language {
    const ext = filePath.split(".").pop()?.toLowerCase()
    switch (ext) {
        case "ts":
            return "typescript"
        case "tsx":
            return "tsx"
        case "js":
            return "javascript"
        case "jsx":
            return "jsx"
        case "json":
            return "json"
        case "yaml":
        case "yml":
            return "yaml"
        default:
            return "unknown"
    }
}

const COMMENT_REGEX = /^(\/\/.*|\/\*[\s\S]*?\*\/)/
const STRING_REGEX = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/
const NUMBER_REGEX = /^(\b\d+\.?\d*\b)/
const WORD_REGEX = /^([a-zA-Z_$][a-zA-Z0-9_$]*)/
const OPERATOR_REGEX = /^([+\-*/%=<>!&|^~?:;,.()[\]{}])/
const WHITESPACE_REGEX = /^(\s+)/

export function highlightLine(line: string, language: Language): HighlightedToken[] {
    if (language === "unknown" || language === "json" || language === "yaml") {
        return [{ text: line, color: "white" }]
    }

    const tokens: HighlightedToken[] = []
    let remaining = line

    while (remaining.length > 0) {
        const commentMatch = COMMENT_REGEX.exec(remaining)
        if (commentMatch) {
            tokens.push({ text: commentMatch[0], color: "gray" })
            remaining = remaining.slice(commentMatch[0].length)
            continue
        }

        const stringMatch = STRING_REGEX.exec(remaining)
        if (stringMatch) {
            tokens.push({ text: stringMatch[0], color: "green" })
            remaining = remaining.slice(stringMatch[0].length)
            continue
        }

        const numberMatch = NUMBER_REGEX.exec(remaining)
        if (numberMatch) {
            tokens.push({ text: numberMatch[0], color: "cyan" })
            remaining = remaining.slice(numberMatch[0].length)
            continue
        }

        const wordMatch = WORD_REGEX.exec(remaining)
        if (wordMatch) {
            const word = wordMatch[0]
            const color = KEYWORDS.has(word) ? "magenta" : "white"
            tokens.push({ text: word, color })
            remaining = remaining.slice(word.length)
            continue
        }

        const operatorMatch = OPERATOR_REGEX.exec(remaining)
        if (operatorMatch) {
            tokens.push({ text: operatorMatch[0], color: "yellow" })
            remaining = remaining.slice(operatorMatch[0].length)
            continue
        }

        const whitespaceMatch = WHITESPACE_REGEX.exec(remaining)
        if (whitespaceMatch) {
            tokens.push({ text: whitespaceMatch[0], color: "white" })
            remaining = remaining.slice(whitespaceMatch[0].length)
            continue
        }

        tokens.push({ text: remaining[0] ?? "", color: "white" })
        remaining = remaining.slice(1)
    }

    return tokens
}
