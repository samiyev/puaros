import { IAnemicModelDetector } from "../../domain/services/IAnemicModelDetector"
import { AnemicModelViolation } from "../../domain/value-objects/AnemicModelViolation"
import { CLASS_KEYWORDS } from "../../shared/constants"
import { LAYERS } from "../../shared/constants/rules"

/**
 * Detects anemic domain model violations
 *
 * This detector identifies entities that lack business logic and contain
 * only getters/setters. Anemic models violate Domain-Driven Design principles.
 *
 * @example
 * ```typescript
 * const detector = new AnemicModelDetector()
 *
 * // Detect anemic models in entity file
 * const code = `
 * class Order {
 *     getStatus() { return this.status }
 *     setStatus(status: string) { this.status = status }
 *     getTotal() { return this.total }
 *     setTotal(total: number) { this.total = total }
 * }
 * `
 * const violations = detector.detectAnemicModels(
 *     code,
 *     'src/domain/entities/Order.ts',
 *     'domain'
 * )
 *
 * // violations will contain anemic model violation
 * console.log(violations.length) // 1
 * console.log(violations[0].className) // 'Order'
 * ```
 */
export class AnemicModelDetector implements IAnemicModelDetector {
    private readonly entityPatterns = [/\/entities\//, /\/aggregates\//]
    private readonly excludePatterns = [
        /\.test\.ts$/,
        /\.spec\.ts$/,
        /Dto\.ts$/,
        /Request\.ts$/,
        /Response\.ts$/,
        /Mapper\.ts$/,
    ]

    /**
     * Detects anemic model violations in the given code
     */
    public detectAnemicModels(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): AnemicModelViolation[] {
        if (!this.shouldAnalyze(filePath, layer)) {
            return []
        }

        const violations: AnemicModelViolation[] = []
        const classes = this.extractClasses(code)

        for (const classInfo of classes) {
            const violation = this.analyzeClass(classInfo, filePath, layer || LAYERS.DOMAIN)
            if (violation) {
                violations.push(violation)
            }
        }

        return violations
    }

    /**
     * Checks if file should be analyzed
     */
    private shouldAnalyze(filePath: string, layer: string | undefined): boolean {
        if (layer !== LAYERS.DOMAIN) {
            return false
        }

        if (this.excludePatterns.some((pattern) => pattern.test(filePath))) {
            return false
        }

        return this.entityPatterns.some((pattern) => pattern.test(filePath))
    }

    /**
     * Extracts class information from code
     */
    private extractClasses(code: string): ClassInfo[] {
        const classes: ClassInfo[] = []
        const lines = code.split("\n")
        let currentClass: { name: string; startLine: number; startIndex: number } | null = null
        let braceCount = 0
        let classBody = ""

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]

            if (!currentClass) {
                const classRegex = /^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/
                const classMatch = classRegex.exec(line)
                if (classMatch) {
                    currentClass = {
                        name: classMatch[1],
                        startLine: i + 1,
                        startIndex: lines.slice(0, i).join("\n").length,
                    }
                    braceCount = 0
                    classBody = ""
                }
            }

            if (currentClass) {
                for (const char of line) {
                    if (char === "{") {
                        braceCount++
                    } else if (char === "}") {
                        braceCount--
                    }
                }

                if (braceCount > 0) {
                    classBody = `${classBody}${line}\n`
                } else if (braceCount === 0 && classBody.length > 0) {
                    const properties = this.extractProperties(classBody)
                    const methods = this.extractMethods(classBody)

                    classes.push({
                        className: currentClass.name,
                        lineNumber: currentClass.startLine,
                        properties,
                        methods,
                    })

                    currentClass = null
                    classBody = ""
                }
            }
        }

        return classes
    }

    /**
     * Extracts properties from class body
     */
    private extractProperties(classBody: string): PropertyInfo[] {
        const properties: PropertyInfo[] = []
        const propertyRegex = /(?:private|protected|public|readonly)*\s*(\w+)(?:\?)?:\s*\w+/g

        let match
        while ((match = propertyRegex.exec(classBody)) !== null) {
            const propertyName = match[1]

            if (!this.isMethodSignature(match[0])) {
                properties.push({ name: propertyName })
            }
        }

        return properties
    }

    /**
     * Extracts methods from class body
     */
    private extractMethods(classBody: string): MethodInfo[] {
        const methods: MethodInfo[] = []
        const methodRegex =
            /(public|private|protected)?\s*(get|set)?\s+(\w+)\s*\([^)]*\)(?:\s*:\s*\w+)?/g

        let match
        while ((match = methodRegex.exec(classBody)) !== null) {
            const visibility = match[1] || CLASS_KEYWORDS.PUBLIC
            const accessor = match[2]
            const methodName = match[3]

            if (methodName === CLASS_KEYWORDS.CONSTRUCTOR) {
                continue
            }

            const isGetter = accessor === "get" || this.isGetterMethod(methodName)
            const isSetter = accessor === "set" || this.isSetterMethod(methodName, classBody)
            const isPublic = visibility === CLASS_KEYWORDS.PUBLIC || !visibility

            methods.push({
                name: methodName,
                isGetter,
                isSetter,
                isPublic,
                isBusinessLogic: !isGetter && !isSetter,
            })
        }

        return methods
    }

    /**
     * Analyzes class for anemic model violations
     */
    private analyzeClass(
        classInfo: ClassInfo,
        filePath: string,
        layer: string,
    ): AnemicModelViolation | null {
        const { className, lineNumber, properties, methods } = classInfo

        if (properties.length === 0 && methods.length === 0) {
            return null
        }

        const businessMethods = methods.filter((m) => m.isBusinessLogic)
        const hasOnlyGettersSetters = businessMethods.length === 0 && methods.length > 0
        const hasPublicSetters = methods.some((m) => m.isSetter && m.isPublic)

        const methodCount = methods.length
        const propertyCount = properties.length

        if (hasPublicSetters) {
            return AnemicModelViolation.create(
                className,
                filePath,
                layer,
                lineNumber,
                methodCount,
                propertyCount,
                false,
                true,
            )
        }

        if (hasOnlyGettersSetters && methodCount >= 2 && propertyCount > 0) {
            return AnemicModelViolation.create(
                className,
                filePath,
                layer,
                lineNumber,
                methodCount,
                propertyCount,
                true,
                false,
            )
        }

        const methodToPropertyRatio = methodCount / Math.max(propertyCount, 1)
        if (
            propertyCount > 0 &&
            businessMethods.length < 2 &&
            methodToPropertyRatio < 1.0 &&
            methodCount > 0
        ) {
            return AnemicModelViolation.create(
                className,
                filePath,
                layer,
                lineNumber,
                methodCount,
                propertyCount,
                false,
                false,
            )
        }

        return null
    }

    /**
     * Checks if method name is a getter pattern
     */
    private isGetterMethod(methodName: string): boolean {
        return (
            methodName.startsWith("get") ||
            methodName.startsWith("is") ||
            methodName.startsWith("has")
        )
    }

    /**
     * Checks if method is a setter pattern
     */
    private isSetterMethod(methodName: string, _classBody: string): boolean {
        return methodName.startsWith("set")
    }

    /**
     * Checks if property declaration is actually a method signature
     */
    private isMethodSignature(propertyDeclaration: string): boolean {
        return propertyDeclaration.includes("(") && propertyDeclaration.includes(")")
    }

    /**
     * Gets line number for a position in code
     */
    private getLineNumber(code: string, position: number): number {
        const lines = code.substring(0, position).split("\n")
        return lines.length
    }
}

interface ClassInfo {
    className: string
    lineNumber: number
    properties: PropertyInfo[]
    methods: MethodInfo[]
}

interface PropertyInfo {
    name: string
}

interface MethodInfo {
    name: string
    isGetter: boolean
    isSetter: boolean
    isPublic: boolean
    isBusinessLogic: boolean
}
