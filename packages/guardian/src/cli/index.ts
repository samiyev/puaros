#!/usr/bin/env node
import { Command } from "commander"
import { analyzeProject } from "../api"
import { version } from "../../package.json"
import {
    CLI_ARGUMENTS,
    CLI_COMMANDS,
    CLI_DESCRIPTIONS,
    CLI_LABELS,
    CLI_MESSAGES,
    CLI_OPTIONS,
    DEFAULT_EXCLUDES,
} from "./constants"

const program = new Command()

program.name(CLI_COMMANDS.NAME).description(CLI_DESCRIPTIONS.MAIN).version(version)

program
    .command(CLI_COMMANDS.CHECK)
    .description(CLI_DESCRIPTIONS.CHECK)
    .argument(CLI_ARGUMENTS.PATH, CLI_DESCRIPTIONS.PATH_ARG)
    .option(CLI_OPTIONS.EXCLUDE, CLI_DESCRIPTIONS.EXCLUDE_OPTION, [...DEFAULT_EXCLUDES])
    .option(CLI_OPTIONS.VERBOSE, CLI_DESCRIPTIONS.VERBOSE_OPTION, false)
    .option(CLI_OPTIONS.NO_HARDCODE, CLI_DESCRIPTIONS.NO_HARDCODE_OPTION)
    .option(CLI_OPTIONS.NO_ARCHITECTURE, CLI_DESCRIPTIONS.NO_ARCHITECTURE_OPTION)
    .action(async (path: string, options) => {
        try {
            console.log(CLI_MESSAGES.ANALYZING)

            const result = await analyzeProject({
                rootDir: path,
                exclude: options.exclude,
            })

            const {
                hardcodeViolations,
                violations,
                circularDependencyViolations,
                namingViolations,
                frameworkLeakViolations,
                metrics,
            } = result

            // Display metrics
            console.log(CLI_MESSAGES.METRICS_HEADER)
            console.log(`   ${CLI_LABELS.FILES_ANALYZED} ${String(metrics.totalFiles)}`)
            console.log(`   ${CLI_LABELS.TOTAL_FUNCTIONS} ${String(metrics.totalFunctions)}`)
            console.log(`   ${CLI_LABELS.TOTAL_IMPORTS} ${String(metrics.totalImports)}`)

            if (Object.keys(metrics.layerDistribution).length > 0) {
                console.log(CLI_MESSAGES.LAYER_DISTRIBUTION_HEADER)
                for (const [layer, count] of Object.entries(metrics.layerDistribution)) {
                    console.log(`   ${layer}: ${String(count)} ${CLI_LABELS.FILES}`)
                }
            }

            // Architecture violations
            if (options.architecture && violations.length > 0) {
                console.log(
                    `${CLI_MESSAGES.VIOLATIONS_HEADER} ${String(violations.length)} ${CLI_LABELS.ARCHITECTURE_VIOLATIONS}\n`,
                )

                violations.forEach((v, index) => {
                    console.log(`${String(index + 1)}. ${v.file}`)
                    console.log(`   Rule: ${v.rule}`)
                    console.log(`   ${v.message}`)
                    console.log("")
                })
            }

            // Circular dependency violations
            if (options.architecture && circularDependencyViolations.length > 0) {
                console.log(
                    `${CLI_MESSAGES.CIRCULAR_DEPS_HEADER} ${String(circularDependencyViolations.length)} ${CLI_LABELS.CIRCULAR_DEPENDENCIES}\n`,
                )

                circularDependencyViolations.forEach((cd, index) => {
                    console.log(`${String(index + 1)}. ${cd.message}`)
                    console.log(`   Severity: ${cd.severity}`)
                    console.log("   Cycle path:")
                    cd.cycle.forEach((file, i) => {
                        console.log(`     ${String(i + 1)}. ${file}`)
                    })
                    console.log(
                        `     ${String(cd.cycle.length + 1)}. ${cd.cycle[0]} (back to start)`,
                    )
                    console.log("")
                })
            }

            // Naming convention violations
            if (options.architecture && namingViolations.length > 0) {
                console.log(
                    `${CLI_MESSAGES.NAMING_VIOLATIONS_HEADER} ${String(namingViolations.length)} ${CLI_LABELS.NAMING_VIOLATIONS}\n`,
                )

                namingViolations.forEach((nc, index) => {
                    console.log(`${String(index + 1)}. ${nc.file}`)
                    console.log(`   File: ${nc.fileName}`)
                    console.log(`   Layer: ${nc.layer}`)
                    console.log(`   Type: ${nc.type}`)
                    console.log(`   Message: ${nc.message}`)
                    if (nc.suggestion) {
                        console.log(`   💡 Suggestion: ${nc.suggestion}`)
                    }
                    console.log("")
                })
            }

            // Framework leak violations
            if (options.architecture && frameworkLeakViolations.length > 0) {
                console.log(
                    `\n🏗️ Found ${String(frameworkLeakViolations.length)} framework leak(s):\n`,
                )

                frameworkLeakViolations.forEach((fl, index) => {
                    console.log(`${String(index + 1)}. ${fl.file}`)
                    console.log(`   Package: ${fl.packageName}`)
                    console.log(`   Category: ${fl.categoryDescription}`)
                    console.log(`   Layer: ${fl.layer}`)
                    console.log(`   Rule: ${fl.rule}`)
                    console.log(`   ${fl.message}`)
                    console.log(`   💡 Suggestion: ${fl.suggestion}`)
                    console.log("")
                })
            }

            // Hardcode violations
            if (options.hardcode && hardcodeViolations.length > 0) {
                console.log(
                    `${CLI_MESSAGES.HARDCODE_VIOLATIONS_HEADER} ${String(hardcodeViolations.length)} ${CLI_LABELS.HARDCODE_VIOLATIONS}\n`,
                )

                hardcodeViolations.forEach((hc, index) => {
                    console.log(
                        `${String(index + 1)}. ${hc.file}:${String(hc.line)}:${String(hc.column)}`,
                    )
                    console.log(`   Type: ${hc.type}`)
                    console.log(`   Value: ${JSON.stringify(hc.value)}`)
                    console.log(`   Context: ${hc.context.trim()}`)
                    console.log(`   💡 Suggested: ${hc.suggestion.constantName}`)
                    console.log(`   📁 Location: ${hc.suggestion.location}`)
                    console.log("")
                })
            }

            // Summary
            const totalIssues =
                violations.length +
                hardcodeViolations.length +
                circularDependencyViolations.length +
                namingViolations.length +
                frameworkLeakViolations.length

            if (totalIssues === 0) {
                console.log(CLI_MESSAGES.NO_ISSUES)
                process.exit(0)
            } else {
                console.log(
                    `${CLI_MESSAGES.ISSUES_TOTAL} ${String(totalIssues)} ${CLI_LABELS.ISSUES_TOTAL}`,
                )
                console.log(CLI_MESSAGES.TIP)

                if (options.verbose) {
                    console.log(CLI_MESSAGES.HELP_FOOTER)
                }

                process.exit(1)
            }
        } catch (error) {
            console.error(`\n❌ ${CLI_MESSAGES.ERROR_PREFIX}`)
            console.error(error instanceof Error ? error.message : String(error))
            console.error("")
            process.exit(1)
        }
    })

program.parse()
