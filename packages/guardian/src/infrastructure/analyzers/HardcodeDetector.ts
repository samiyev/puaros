import { IHardcodeDetector } from "../../domain/services/IHardcodeDetector"
import { HardcodedValue } from "../../domain/value-objects/HardcodedValue"
import { ALLOWED_NUMBERS, CODE_PATTERNS, DETECTION_KEYWORDS } from "../constants/defaults"
import { HARDCODE_TYPES } from "../../shared/constants"

/**
 * Detects hardcoded values (magic numbers and strings) in TypeScript/JavaScript code
 *
 * This detector identifies configuration values, URLs, timeouts, ports, and other
 * constants that should be extracted to configuration files. It uses pattern matching
 * and context analysis to reduce false positives.
 *
 * @example
 * ```typescript
 * const detector = new HardcodeDetector()
 * const code = `
 *     const timeout = 5000
 *     const url = "http://localhost:8080"
 * `
 * const violations = detector.detectAll(code, 'config.ts')
 * // Returns array of HardcodedValue objects
 * ```
 */
export class HardcodeDetector implements IHardcodeDetector {
    private readonly ALLOWED_NUMBERS = ALLOWED_NUMBERS

    private readonly ALLOWED_STRING_PATTERNS = [/^[a-z]$/i, /^\/$/, /^\\$/, /^\s+$/, /^,$/, /^\.$/]

    /**
     * Detects all hardcoded values (both numbers and strings) in the given code
     *
     * @param code - Source code to analyze
     * @param filePath - File path for context (used in violation reports)
     * @returns Array of detected hardcoded values with suggestions
     */
    public detectAll(code: string, filePath: string): HardcodedValue[] {
        if (this.isConstantsFile(filePath)) {
            return []
        }
        const magicNumbers = this.detectMagicNumbers(code, filePath)
        const magicStrings = this.detectMagicStrings(code, filePath)
        return [...magicNumbers, ...magicStrings]
    }

    /**
     * Check if a file is a constants definition file
     */
    private isConstantsFile(filePath: string): boolean {
        const _fileName = filePath.split("/").pop() ?? ""
        const constantsPatterns = [
            /^constants?\.(ts|js)$/i,
            /constants?\/.*\.(ts|js)$/i,
            /\/(constants|config|settings|defaults)\.ts$/i,
        ]
        return constantsPatterns.some((pattern) => pattern.test(filePath))
    }

    /**
     * Check if a line is inside an exported constant definition
     */
    private isInExportedConstant(lines: string[], lineIndex: number): boolean {
        const currentLineTrimmed = lines[lineIndex].trim()

        if (this.isSingleLineExportConst(currentLineTrimmed)) {
            return true
        }

        const exportConstStart = this.findExportConstStart(lines, lineIndex)
        if (exportConstStart === -1) {
            return false
        }

        const { braces, brackets } = this.countUnclosedBraces(lines, exportConstStart, lineIndex)
        return braces > 0 || brackets > 0
    }

    /**
     * Check if a line is a single-line export const declaration
     */
    private isSingleLineExportConst(line: string): boolean {
        if (!line.startsWith(CODE_PATTERNS.EXPORT_CONST)) {
            return false
        }

        const hasObjectOrArray =
            line.includes(CODE_PATTERNS.OBJECT_START) || line.includes(CODE_PATTERNS.ARRAY_START)

        if (hasObjectOrArray) {
            const hasAsConstEnding =
                line.includes(CODE_PATTERNS.AS_CONST_OBJECT) ||
                line.includes(CODE_PATTERNS.AS_CONST_ARRAY) ||
                line.includes(CODE_PATTERNS.AS_CONST_END_SEMICOLON_OBJECT) ||
                line.includes(CODE_PATTERNS.AS_CONST_END_SEMICOLON_ARRAY)

            return hasAsConstEnding
        }

        return line.includes(CODE_PATTERNS.AS_CONST)
    }

    /**
     * Find the starting line of an export const declaration
     */
    private findExportConstStart(lines: string[], lineIndex: number): number {
        for (let currentLine = lineIndex; currentLine >= 0; currentLine--) {
            const trimmed = lines[currentLine].trim()

            const isExportConst =
                trimmed.startsWith(CODE_PATTERNS.EXPORT_CONST) &&
                (trimmed.includes(CODE_PATTERNS.OBJECT_START) ||
                    trimmed.includes(CODE_PATTERNS.ARRAY_START))

            if (isExportConst) {
                return currentLine
            }

            const isTopLevelStatement =
                currentLine < lineIndex &&
                (trimmed.startsWith(CODE_PATTERNS.EXPORT) ||
                    trimmed.startsWith(CODE_PATTERNS.IMPORT))

            if (isTopLevelStatement) {
                break
            }
        }

        return -1
    }

    /**
     * Count unclosed braces and brackets between two line indices
     */
    private countUnclosedBraces(
        lines: string[],
        startLine: number,
        endLine: number,
    ): { braces: number; brackets: number } {
        let braces = 0
        let brackets = 0

        for (let i = startLine; i <= endLine; i++) {
            const line = lines[i]
            let inString = false
            let stringChar = ""

            for (let j = 0; j < line.length; j++) {
                const char = line[j]
                const prevChar = j > 0 ? line[j - 1] : ""

                if ((char === "'" || char === '"' || char === "`") && prevChar !== "\\") {
                    if (!inString) {
                        inString = true
                        stringChar = char
                    } else if (char === stringChar) {
                        inString = false
                        stringChar = ""
                    }
                }

                if (!inString) {
                    if (char === "{") {
                        braces++
                    } else if (char === "}") {
                        braces--
                    } else if (char === "[") {
                        brackets++
                    } else if (char === "]") {
                        brackets--
                    }
                }
            }
        }

        return { braces, brackets }
    }

    /**
     * Detects magic numbers in code (timeouts, ports, limits, retries, etc.)
     *
     * Skips allowed numbers (-1, 0, 1, 2, 10, 100, 1000) and values in exported constants
     *
     * @param code - Source code to analyze
     * @param _filePath - File path (currently unused, reserved for future use)
     * @returns Array of detected magic numbers
     */
    public detectMagicNumbers(code: string, _filePath: string): HardcodedValue[] {
        const results: HardcodedValue[] = []
        const lines = code.split("\n")

        const numberPatterns = [
            /(?:setTimeout|setInterval)\s*\(\s*[^,]+,\s*(\d+)/g,
            /(?:maxRetries|retries|attempts)\s*[=:]\s*(\d+)/gi,
            /(?:limit|max|min)\s*[=:]\s*(\d+)/gi,
            /(?:port|PORT)\s*[=:]\s*(\d+)/g,
            /(?:delay|timeout|TIMEOUT)\s*[=:]\s*(\d+)/gi,
        ]

        lines.forEach((line, lineIndex) => {
            if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
                return
            }

            // Skip lines inside exported constants
            if (this.isInExportedConstant(lines, lineIndex)) {
                return
            }

            numberPatterns.forEach((pattern) => {
                let match
                const regex = new RegExp(pattern)

                while ((match = regex.exec(line)) !== null) {
                    const value = parseInt(match[1], 10)

                    if (!this.ALLOWED_NUMBERS.has(value)) {
                        results.push(
                            HardcodedValue.create(
                                value,
                                HARDCODE_TYPES.MAGIC_NUMBER,
                                lineIndex + 1,
                                match.index,
                                line.trim(),
                            ),
                        )
                    }
                }
            })

            const genericNumberRegex = /\b(\d{3,})\b/g
            let match

            while ((match = genericNumberRegex.exec(line)) !== null) {
                const value = parseInt(match[1], 10)

                if (
                    !this.ALLOWED_NUMBERS.has(value) &&
                    !this.isInComment(line, match.index) &&
                    !this.isInString(line, match.index)
                ) {
                    const context = this.extractContext(line, match.index)
                    if (this.looksLikeMagicNumber(context)) {
                        results.push(
                            HardcodedValue.create(
                                value,
                                HARDCODE_TYPES.MAGIC_NUMBER,
                                lineIndex + 1,
                                match.index,
                                line.trim(),
                            ),
                        )
                    }
                }
            }
        })

        return results
    }

    /**
     * Detects magic strings in code (URLs, connection strings, error messages, etc.)
     *
     * Skips short strings (≤3 chars), console logs, test descriptions, imports,
     * and values in exported constants
     *
     * @param code - Source code to analyze
     * @param _filePath - File path (currently unused, reserved for future use)
     * @returns Array of detected magic strings
     */
    public detectMagicStrings(code: string, _filePath: string): HardcodedValue[] {
        const results: HardcodedValue[] = []
        const lines = code.split("\n")

        const stringRegex = /(['"`])(?:(?!\1).)+\1/g

        lines.forEach((line, lineIndex) => {
            if (
                line.trim().startsWith("//") ||
                line.trim().startsWith("*") ||
                line.includes("import ") ||
                line.includes("from ")
            ) {
                return
            }

            // Skip lines inside exported constants
            if (this.isInExportedConstant(lines, lineIndex)) {
                return
            }

            let match
            const regex = new RegExp(stringRegex)

            while ((match = regex.exec(line)) !== null) {
                const fullMatch = match[0]
                const value = fullMatch.slice(1, -1)

                // Skip template literals (backtick strings with ${} interpolation)
                if (fullMatch.startsWith("`") || value.includes("${")) {
                    continue
                }

                if (!this.isAllowedString(value) && this.looksLikeMagicString(line, value)) {
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
        })

        return results
    }

    private isAllowedString(str: string): boolean {
        if (str.length <= 1) {
            return true
        }

        return this.ALLOWED_STRING_PATTERNS.some((pattern) => pattern.test(str))
    }

    private looksLikeMagicString(line: string, value: string): boolean {
        const lowerLine = line.toLowerCase()

        if (
            lowerLine.includes(DETECTION_KEYWORDS.TEST) ||
            lowerLine.includes(DETECTION_KEYWORDS.DESCRIBE)
        ) {
            return false
        }

        if (
            lowerLine.includes(DETECTION_KEYWORDS.CONSOLE_LOG) ||
            lowerLine.includes(DETECTION_KEYWORDS.CONSOLE_ERROR)
        ) {
            return false
        }

        if (value.includes(DETECTION_KEYWORDS.HTTP) || value.includes(DETECTION_KEYWORDS.API)) {
            return true
        }

        if (/^\d{2,}$/.test(value)) {
            return false
        }

        return value.length > 3
    }

    private looksLikeMagicNumber(context: string): boolean {
        const lowerContext = context.toLowerCase()

        const configKeywords = [
            DETECTION_KEYWORDS.TIMEOUT,
            DETECTION_KEYWORDS.DELAY,
            DETECTION_KEYWORDS.RETRY,
            DETECTION_KEYWORDS.LIMIT,
            DETECTION_KEYWORDS.MAX,
            DETECTION_KEYWORDS.MIN,
            DETECTION_KEYWORDS.PORT,
            DETECTION_KEYWORDS.INTERVAL,
        ]

        return configKeywords.some((keyword) => lowerContext.includes(keyword))
    }

    private isInComment(line: string, index: number): boolean {
        const beforeIndex = line.substring(0, index)
        return beforeIndex.includes("//") || beforeIndex.includes("/*")
    }

    private isInString(line: string, index: number): boolean {
        const beforeIndex = line.substring(0, index)
        const singleQuotes = (beforeIndex.match(/'/g) ?? []).length
        const doubleQuotes = (beforeIndex.match(/"/g) ?? []).length
        const backticks = (beforeIndex.match(/`/g) ?? []).length

        return singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0
    }

    private extractContext(line: string, index: number): string {
        const start = Math.max(0, index - 30)
        const end = Math.min(line.length, index + 30)
        return line.substring(start, end)
    }
}
