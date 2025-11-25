import { SEVERITY_LEVELS, type SeverityLevel } from "../../shared/constants"
import type {
    AggregateBoundaryViolation,
    AnemicModelViolation,
    ArchitectureViolation,
    CircularDependencyViolation,
    DependencyDirectionViolation,
    EntityExposureViolation,
    FrameworkLeakViolation,
    HardcodeViolation,
    NamingConventionViolation,
    RepositoryPatternViolation,
    SecretViolation,
} from "../../application/use-cases/AnalyzeProject"
import { SEVERITY_DISPLAY_LABELS, SEVERITY_SECTION_HEADERS } from "../constants"
import { ViolationGrouper } from "../groupers/ViolationGrouper"

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
    [SEVERITY_LEVELS.CRITICAL]: SEVERITY_DISPLAY_LABELS.CRITICAL,
    [SEVERITY_LEVELS.HIGH]: SEVERITY_DISPLAY_LABELS.HIGH,
    [SEVERITY_LEVELS.MEDIUM]: SEVERITY_DISPLAY_LABELS.MEDIUM,
    [SEVERITY_LEVELS.LOW]: SEVERITY_DISPLAY_LABELS.LOW,
}

const SEVERITY_HEADER: Record<SeverityLevel, string> = {
    [SEVERITY_LEVELS.CRITICAL]: SEVERITY_SECTION_HEADERS.CRITICAL,
    [SEVERITY_LEVELS.HIGH]: SEVERITY_SECTION_HEADERS.HIGH,
    [SEVERITY_LEVELS.MEDIUM]: SEVERITY_SECTION_HEADERS.MEDIUM,
    [SEVERITY_LEVELS.LOW]: SEVERITY_SECTION_HEADERS.LOW,
}

export class OutputFormatter {
    private readonly grouper = new ViolationGrouper()

    displayGroupedViolations<T extends { severity: SeverityLevel }>(
        violations: T[],
        displayFn: (v: T, index: number) => void,
        limit?: number,
    ): void {
        const grouped = this.grouper.groupBySeverity(violations)
        const severities: SeverityLevel[] = [
            SEVERITY_LEVELS.CRITICAL,
            SEVERITY_LEVELS.HIGH,
            SEVERITY_LEVELS.MEDIUM,
            SEVERITY_LEVELS.LOW,
        ]

        let totalDisplayed = 0
        const totalAvailable = violations.length

        for (const severity of severities) {
            const items = grouped.get(severity)
            if (items && items.length > 0) {
                console.warn(SEVERITY_HEADER[severity])
                console.warn(`Found ${String(items.length)} issue(s)\n`)

                const itemsToDisplay =
                    limit !== undefined ? items.slice(0, limit - totalDisplayed) : items
                itemsToDisplay.forEach((item, index) => {
                    displayFn(item, totalDisplayed + index)
                })
                totalDisplayed += itemsToDisplay.length

                if (limit !== undefined && totalDisplayed >= limit) {
                    break
                }
            }
        }

        if (limit !== undefined && totalAvailable > limit) {
            console.warn(
                `\n⚠️  Showing first ${String(limit)} of ${String(totalAvailable)} issues (use --limit to adjust)\n`,
            )
        }
    }

    formatArchitectureViolation(v: ArchitectureViolation, index: number): void {
        console.log(`${String(index + 1)}. ${v.file}`)
        console.log(`   Severity: ${SEVERITY_LABELS[v.severity]}`)
        console.log(`   Rule: ${v.rule}`)
        console.log(`   ${v.message}`)
        console.log("")
    }

    formatCircularDependency(cd: CircularDependencyViolation, index: number): void {
        console.log(`${String(index + 1)}. ${cd.message}`)
        console.log(`   Severity: ${SEVERITY_LABELS[cd.severity]}`)
        console.log("   Cycle path:")
        cd.cycle.forEach((file, i) => {
            console.log(`     ${String(i + 1)}. ${file}`)
        })
        console.log(`     ${String(cd.cycle.length + 1)}. ${cd.cycle[0]} (back to start)`)
        console.log("")
    }

    formatNamingViolation(nc: NamingConventionViolation, index: number): void {
        console.log(`${String(index + 1)}. ${nc.file}`)
        console.log(`   Severity: ${SEVERITY_LABELS[nc.severity]}`)
        console.log(`   File: ${nc.fileName}`)
        console.log(`   Layer: ${nc.layer}`)
        console.log(`   Type: ${nc.type}`)
        console.log(`   Message: ${nc.message}`)
        if (nc.suggestion) {
            console.log(`   💡 Suggestion: ${nc.suggestion}`)
        }
        console.log("")
    }

    formatFrameworkLeak(fl: FrameworkLeakViolation, index: number): void {
        console.log(`${String(index + 1)}. ${fl.file}`)
        console.log(`   Severity: ${SEVERITY_LABELS[fl.severity]}`)
        console.log(`   Package: ${fl.packageName}`)
        console.log(`   Category: ${fl.categoryDescription}`)
        console.log(`   Layer: ${fl.layer}`)
        console.log(`   Rule: ${fl.rule}`)
        console.log(`   ${fl.message}`)
        console.log(`   💡 Suggestion: ${fl.suggestion}`)
        console.log("")
    }

    formatEntityExposure(ee: EntityExposureViolation, index: number): void {
        const location = ee.line ? `${ee.file}:${String(ee.line)}` : ee.file
        console.log(`${String(index + 1)}. ${location}`)
        console.log(`   Severity: ${SEVERITY_LABELS[ee.severity]}`)
        console.log(`   Entity: ${ee.entityName}`)
        console.log(`   Return Type: ${ee.returnType}`)
        if (ee.methodName) {
            console.log(`   Method: ${ee.methodName}`)
        }
        console.log(`   Layer: ${ee.layer}`)
        console.log(`   Rule: ${ee.rule}`)
        console.log(`   ${ee.message}`)
        console.log("   💡 Suggestion:")
        ee.suggestion.split("\n").forEach((line) => {
            if (line.trim()) {
                console.log(`      ${line}`)
            }
        })
        console.log("")
    }

    formatDependencyDirection(dd: DependencyDirectionViolation, index: number): void {
        console.log(`${String(index + 1)}. ${dd.file}`)
        console.log(`   Severity: ${SEVERITY_LABELS[dd.severity]}`)
        console.log(`   From Layer: ${dd.fromLayer}`)
        console.log(`   To Layer: ${dd.toLayer}`)
        console.log(`   Import: ${dd.importPath}`)
        console.log(`   ${dd.message}`)
        console.log(`   💡 Suggestion: ${dd.suggestion}`)
        console.log("")
    }

    formatRepositoryPattern(rp: RepositoryPatternViolation, index: number): void {
        console.log(`${String(index + 1)}. ${rp.file}`)
        console.log(`   Severity: ${SEVERITY_LABELS[rp.severity]}`)
        console.log(`   Layer: ${rp.layer}`)
        console.log(`   Type: ${rp.violationType}`)
        console.log(`   Details: ${rp.details}`)
        console.log(`   ${rp.message}`)
        console.log(`   💡 Suggestion: ${rp.suggestion}`)
        console.log("")
    }

    formatAggregateBoundary(ab: AggregateBoundaryViolation, index: number): void {
        const location = ab.line ? `${ab.file}:${String(ab.line)}` : ab.file
        console.log(`${String(index + 1)}. ${location}`)
        console.log(`   Severity: ${SEVERITY_LABELS[ab.severity]}`)
        console.log(`   From Aggregate: ${ab.fromAggregate}`)
        console.log(`   To Aggregate: ${ab.toAggregate}`)
        console.log(`   Entity: ${ab.entityName}`)
        console.log(`   Import: ${ab.importPath}`)
        console.log(`   ${ab.message}`)
        console.log("   💡 Suggestion:")
        ab.suggestion.split("\n").forEach((line) => {
            if (line.trim()) {
                console.log(`      ${line}`)
            }
        })
        console.log("")
    }

    formatSecretViolation(sv: SecretViolation, index: number): void {
        const location = `${sv.file}:${String(sv.line)}:${String(sv.column)}`
        console.log(`${String(index + 1)}. ${location}`)
        console.log(`   Severity: ${SEVERITY_LABELS[sv.severity]} ⚠️`)
        console.log(`   Secret Type: ${sv.secretType}`)
        console.log(`   ${sv.message}`)
        console.log("   🔐 CRITICAL: Rotate this secret immediately!")
        console.log("   💡 Suggestion:")
        sv.suggestion.split("\n").forEach((line) => {
            if (line.trim()) {
                console.log(`      ${line}`)
            }
        })
        console.log("")
    }

    formatHardcodeViolation(hc: HardcodeViolation, index: number): void {
        console.log(`${String(index + 1)}. ${hc.file}:${String(hc.line)}:${String(hc.column)}`)
        console.log(`   Severity: ${SEVERITY_LABELS[hc.severity]}`)
        console.log(`   Type: ${hc.type}`)
        console.log(`   Value: ${JSON.stringify(hc.value)}`)
        console.log(`   Context: ${hc.context.trim()}`)
        console.log(`   💡 Suggested: ${hc.suggestion.constantName}`)
        console.log(`   📁 Location: ${hc.suggestion.location}`)
        console.log("")
    }

    formatAnemicModelViolation(am: AnemicModelViolation, index: number): void {
        const location = am.line ? `${am.file}:${String(am.line)}` : am.file
        console.log(`${String(index + 1)}. ${location}`)
        console.log(`   Severity: ${SEVERITY_LABELS[am.severity]}`)
        console.log(`   Class: ${am.className}`)
        console.log(`   Layer: ${am.layer}`)
        console.log(
            `   Methods: ${String(am.methodCount)} | Properties: ${String(am.propertyCount)}`,
        )

        if (am.hasPublicSetters) {
            console.log("   ⚠️  Has public setters (DDD anti-pattern)")
        }
        if (am.hasOnlyGettersSetters) {
            console.log("   ⚠️  Only getters/setters (no business logic)")
        }

        console.log(`   ${am.message}`)
        console.log("   💡 Suggestion:")
        am.suggestion.split("\n").forEach((line) => {
            if (line.trim()) {
                console.log(`      ${line}`)
            }
        })
        console.log("")
    }
}
