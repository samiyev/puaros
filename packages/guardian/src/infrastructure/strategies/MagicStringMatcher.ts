import { HardcodedValue } from "../../domain/value-objects/HardcodedValue"
import { DETECTION_KEYWORDS } from "../constants/defaults"
import { HARDCODE_TYPES } from "../../shared/constants"
import { ExportConstantAnalyzer } from "./ExportConstantAnalyzer"
import {
    DYNAMIC_IMPORT_PATTERN_PARTS,
    REGEX_ESCAPE_PATTERN,
} from "../../domain/constants/SecretExamples"

/**
 * Detects magic strings in code
 *
 * Identifies hardcoded string values that should be extracted
 * to constants, excluding test code, console logs, and type contexts.
 */
export class MagicStringMatcher {
    private readonly stringRegex = /(['"`])(?:(?!\1).)+\1/g

    private readonly allowedPatterns = [/^[a-z]$/i, /^\/$/, /^\\$/, /^\s+$/, /^,$/, /^\.$/]

    private readonly typeContextPatterns = [
        /^\s*type\s+\w+\s*=/i,
        /^\s*interface\s+\w+/i,
        /^\s*\w+\s*:\s*['"`]/,
        /\s+as\s+['"`]/,
        /Record<.*,\s*import\(/,
        /typeof\s+\w+\s*===\s*['"`]/,
        /['"`]\s*===\s*typeof\s+\w+/,
    ]

    constructor(private readonly exportAnalyzer: ExportConstantAnalyzer) {}

    /**
     * Detects magic strings in code
     */
    public detect(code: string): HardcodedValue[] {
        const results: HardcodedValue[] = []
        const lines = code.split("\n")

        lines.forEach((line, lineIndex) => {
            if (this.shouldSkipLine(line, lines, lineIndex)) {
                return
            }

            this.detectStringsInLine(line, lineIndex, results)
        })

        return results
    }

    /**
     * Checks if line should be skipped
     */
    private shouldSkipLine(line: string, lines: string[], lineIndex: number): boolean {
        if (
            line.trim().startsWith("//") ||
            line.trim().startsWith("*") ||
            line.includes("import ") ||
            line.includes("from ")
        ) {
            return true
        }

        return this.exportAnalyzer.isInExportedConstant(lines, lineIndex)
    }

    /**
     * Detects strings in a single line
     */
    private detectStringsInLine(line: string, lineIndex: number, results: HardcodedValue[]): void {
        let match
        const regex = new RegExp(this.stringRegex)

        while ((match = regex.exec(line)) !== null) {
            const fullMatch = match[0]
            const value = fullMatch.slice(1, -1)

            if (this.shouldDetectString(fullMatch, value, line)) {
                results.push(
                    HardcodedValue.create(
                        value,
                        HARDCODE_TYPES.MAGIC_STRING,
                        lineIndex + 1,
                        match.index,
                        line.trim(),
                    ),
                )
            }
        }
    }

    /**
     * Checks if string should be detected
     */
    private shouldDetectString(fullMatch: string, value: string, line: string): boolean {
        if (fullMatch.startsWith("`") || value.includes("${")) {
            return false
        }

        if (this.isAllowedString(value)) {
            return false
        }

        return this.looksLikeMagicString(line, value)
    }

    /**
     * Checks if string is allowed (short strings, single chars, etc.)
     */
    private isAllowedString(str: string): boolean {
        if (str.length <= 1) {
            return true
        }

        return this.allowedPatterns.some((pattern) => pattern.test(str))
    }

    /**
     * Checks if line context suggests a magic string
     */
    private looksLikeMagicString(line: string, value: string): boolean {
        const lowerLine = line.toLowerCase()

        if (this.isTestCode(lowerLine)) {
            return false
        }

        if (this.isConsoleLog(lowerLine)) {
            return false
        }

        if (this.isInTypeContext(line)) {
            return false
        }

        if (this.isInSymbolCall(line, value)) {
            return false
        }

        if (this.isInImportCall(line, value)) {
            return false
        }

        if (this.isUrlOrApi(value)) {
            return true
        }

        if (/^\d{2,}$/.test(value)) {
            return false
        }

        return value.length > 3
    }

    /**
     * Checks if line is test code
     */
    private isTestCode(lowerLine: string): boolean {
        return (
            lowerLine.includes(DETECTION_KEYWORDS.TEST) ||
            lowerLine.includes(DETECTION_KEYWORDS.DESCRIBE)
        )
    }

    /**
     * Checks if line is console log
     */
    private isConsoleLog(lowerLine: string): boolean {
        return (
            lowerLine.includes(DETECTION_KEYWORDS.CONSOLE_LOG) ||
            lowerLine.includes(DETECTION_KEYWORDS.CONSOLE_ERROR)
        )
    }

    /**
     * Checks if line is in type context
     */
    private isInTypeContext(line: string): boolean {
        const trimmedLine = line.trim()

        if (this.typeContextPatterns.some((pattern) => pattern.test(trimmedLine))) {
            return true
        }

        if (trimmedLine.includes("|") && /['"`][^'"`]+['"`]\s*\|/.test(trimmedLine)) {
            return true
        }

        return false
    }

    /**
     * Checks if string is inside Symbol() call
     */
    private isInSymbolCall(line: string, stringValue: string): boolean {
        const escapedValue = stringValue.replace(
            /[.*+?^${}()|[\]\\]/g,
            REGEX_ESCAPE_PATTERN.DOLLAR_AMPERSAND,
        )
        const symbolPattern = new RegExp(`Symbol\\s*\\(\\s*['"\`]${escapedValue}['"\`]\\s*\\)`)
        return symbolPattern.test(line)
    }

    /**
     * Checks if string is inside import() call
     */
    private isInImportCall(line: string, stringValue: string): boolean {
        const importPattern = new RegExp(
            `import\\s*\\(\\s*['${DYNAMIC_IMPORT_PATTERN_PARTS.QUOTE_START}'${DYNAMIC_IMPORT_PATTERN_PARTS.QUOTE_END}"]\\s*\\)`,
        )
        return importPattern.test(line) && line.includes(stringValue)
    }

    /**
     * Checks if string contains URL or API reference
     */
    private isUrlOrApi(value: string): boolean {
        return value.includes(DETECTION_KEYWORDS.HTTP) || value.includes(DETECTION_KEYWORDS.API)
    }
}
