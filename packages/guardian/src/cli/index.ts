#!/usr/bin/env node
import { Command } from "commander"
import { analyzeProject } from "../api"
import { version } from "../../package.json"
import {
    CLI_ARGUMENTS,
    CLI_COMMANDS,
    CLI_DESCRIPTIONS,
    CLI_HELP_TEXT,
    CLI_LABELS,
    CLI_MESSAGES,
    CLI_OPTIONS,
    DEFAULT_EXCLUDES,
} from "./constants"
import { SEVERITY_LEVELS, type SeverityLevel } from "../shared/constants"
import { ViolationGrouper } from "./groupers/ViolationGrouper"
import { OutputFormatter } from "./formatters/OutputFormatter"
import { StatisticsFormatter } from "./formatters/StatisticsFormatter"

const program = new Command()

program
    .name(CLI_COMMANDS.NAME)
    .description(CLI_DESCRIPTIONS.MAIN)
    .version(version)
    .addHelpText(
        CLI_HELP_TEXT.POSITION,
        CLI_HELP_TEXT.EXAMPLES_HEADER +
            CLI_HELP_TEXT.EXAMPLE_BASIC +
            CLI_HELP_TEXT.EXAMPLE_CRITICAL +
            CLI_HELP_TEXT.EXAMPLE_SEVERITY +
            CLI_HELP_TEXT.EXAMPLE_LIMIT +
            CLI_HELP_TEXT.EXAMPLE_NO_HARDCODE +
            CLI_HELP_TEXT.EXAMPLE_NO_ARCHITECTURE +
            CLI_HELP_TEXT.EXAMPLE_EXCLUDE +
            CLI_HELP_TEXT.FIX_HEADER +
            CLI_HELP_TEXT.FIX_HARDCODE +
            CLI_HELP_TEXT.FIX_CIRCULAR +
            CLI_HELP_TEXT.FIX_FRAMEWORK +
            CLI_HELP_TEXT.FIX_NAMING +
            CLI_HELP_TEXT.FIX_ENTITY +
            CLI_HELP_TEXT.FIX_DEPENDENCY +
            CLI_HELP_TEXT.FIX_REPOSITORY +
            CLI_HELP_TEXT.FOOTER +
            CLI_HELP_TEXT.AI_AGENT_HEADER +
            CLI_HELP_TEXT.AI_AGENT_INTRO +
            CLI_HELP_TEXT.AI_AGENT_STEP1 +
            CLI_HELP_TEXT.AI_AGENT_STEP1_CMD +
            CLI_HELP_TEXT.AI_AGENT_STEP2 +
            CLI_HELP_TEXT.AI_AGENT_STEP2_DETAIL +
            CLI_HELP_TEXT.AI_AGENT_STEP3 +
            CLI_HELP_TEXT.AI_AGENT_STEP3_CMD +
            CLI_HELP_TEXT.AI_AGENT_STEP4 +
            CLI_HELP_TEXT.AI_AGENT_STEP4_CMDS +
            CLI_HELP_TEXT.AI_AGENT_OUTPUT +
            CLI_HELP_TEXT.AI_AGENT_OUTPUT_DETAIL +
            CLI_HELP_TEXT.AI_AGENT_PRIORITY,
    )

program
    .command(CLI_COMMANDS.CHECK)
    .description(CLI_DESCRIPTIONS.CHECK)
    .argument(CLI_ARGUMENTS.PATH, CLI_DESCRIPTIONS.PATH_ARG)
    .option(CLI_OPTIONS.EXCLUDE, CLI_DESCRIPTIONS.EXCLUDE_OPTION, [...DEFAULT_EXCLUDES])
    .option(CLI_OPTIONS.VERBOSE, CLI_DESCRIPTIONS.VERBOSE_OPTION, false)
    .option(CLI_OPTIONS.NO_HARDCODE, CLI_DESCRIPTIONS.NO_HARDCODE_OPTION)
    .option(CLI_OPTIONS.NO_ARCHITECTURE, CLI_DESCRIPTIONS.NO_ARCHITECTURE_OPTION)
    .option(CLI_OPTIONS.MIN_SEVERITY, CLI_DESCRIPTIONS.MIN_SEVERITY_OPTION)
    .option(CLI_OPTIONS.ONLY_CRITICAL, CLI_DESCRIPTIONS.ONLY_CRITICAL_OPTION, false)
    .option(CLI_OPTIONS.LIMIT, CLI_DESCRIPTIONS.LIMIT_OPTION)
    .action(async (path: string, options) => {
        const grouper = new ViolationGrouper()
        const outputFormatter = new OutputFormatter()
        const statsFormatter = new StatisticsFormatter()

        try {
            console.log(CLI_MESSAGES.ANALYZING)

            const result = await analyzeProject({
                rootDir: path,
                exclude: options.exclude,
            })

            const { metrics } = result
            let {
                hardcodeViolations,
                violations,
                circularDependencyViolations,
                namingViolations,
                frameworkLeakViolations,
                entityExposureViolations,
                dependencyDirectionViolations,
                repositoryPatternViolations,
                aggregateBoundaryViolations,
                secretViolations,
                anemicModelViolations,
            } = result

            const minSeverity: SeverityLevel | undefined = options.onlyCritical
                ? SEVERITY_LEVELS.CRITICAL
                : options.minSeverity
                  ? (options.minSeverity.toLowerCase() as SeverityLevel)
                  : undefined

            const limit: number | undefined = options.limit
                ? parseInt(options.limit, 10)
                : undefined

            if (minSeverity) {
                violations = grouper.filterBySeverity(violations, minSeverity)
                hardcodeViolations = grouper.filterBySeverity(hardcodeViolations, minSeverity)
                circularDependencyViolations = grouper.filterBySeverity(
                    circularDependencyViolations,
                    minSeverity,
                )
                namingViolations = grouper.filterBySeverity(namingViolations, minSeverity)
                frameworkLeakViolations = grouper.filterBySeverity(
                    frameworkLeakViolations,
                    minSeverity,
                )
                entityExposureViolations = grouper.filterBySeverity(
                    entityExposureViolations,
                    minSeverity,
                )
                dependencyDirectionViolations = grouper.filterBySeverity(
                    dependencyDirectionViolations,
                    minSeverity,
                )
                repositoryPatternViolations = grouper.filterBySeverity(
                    repositoryPatternViolations,
                    minSeverity,
                )
                aggregateBoundaryViolations = grouper.filterBySeverity(
                    aggregateBoundaryViolations,
                    minSeverity,
                )
                secretViolations = grouper.filterBySeverity(secretViolations, minSeverity)
                anemicModelViolations = grouper.filterBySeverity(anemicModelViolations, minSeverity)

                statsFormatter.displaySeverityFilterMessage(
                    options.onlyCritical,
                    options.minSeverity,
                )
            }

            statsFormatter.displayMetrics(metrics)

            if (options.architecture && violations.length > 0) {
                console.log(
                    `\n${CLI_MESSAGES.VIOLATIONS_HEADER} ${String(violations.length)} ${CLI_LABELS.ARCHITECTURE_VIOLATIONS}`,
                )
                outputFormatter.displayGroupedViolations(
                    violations,
                    (v, i) => {
                        outputFormatter.formatArchitectureViolation(v, i)
                    },
                    limit,
                )
            }

            if (options.architecture && circularDependencyViolations.length > 0) {
                console.log(
                    `\n${CLI_MESSAGES.CIRCULAR_DEPS_HEADER} ${String(circularDependencyViolations.length)} ${CLI_LABELS.CIRCULAR_DEPENDENCIES}`,
                )
                outputFormatter.displayGroupedViolations(
                    circularDependencyViolations,
                    (cd, i) => {
                        outputFormatter.formatCircularDependency(cd, i)
                    },
                    limit,
                )
            }

            if (options.architecture && namingViolations.length > 0) {
                console.log(
                    `\n${CLI_MESSAGES.NAMING_VIOLATIONS_HEADER} ${String(namingViolations.length)} ${CLI_LABELS.NAMING_VIOLATIONS}`,
                )
                outputFormatter.displayGroupedViolations(
                    namingViolations,
                    (nc, i) => {
                        outputFormatter.formatNamingViolation(nc, i)
                    },
                    limit,
                )
            }

            if (options.architecture && frameworkLeakViolations.length > 0) {
                console.log(
                    `\n🏗️ Found ${String(frameworkLeakViolations.length)} framework leak(s)`,
                )
                outputFormatter.displayGroupedViolations(
                    frameworkLeakViolations,
                    (fl, i) => {
                        outputFormatter.formatFrameworkLeak(fl, i)
                    },
                    limit,
                )
            }

            if (options.architecture && entityExposureViolations.length > 0) {
                console.log(
                    `\n🎭 Found ${String(entityExposureViolations.length)} entity exposure(s)`,
                )
                outputFormatter.displayGroupedViolations(
                    entityExposureViolations,
                    (ee, i) => {
                        outputFormatter.formatEntityExposure(ee, i)
                    },
                    limit,
                )
            }

            if (options.architecture && dependencyDirectionViolations.length > 0) {
                console.log(
                    `\n⚠️ Found ${String(dependencyDirectionViolations.length)} dependency direction violation(s)`,
                )
                outputFormatter.displayGroupedViolations(
                    dependencyDirectionViolations,
                    (dd, i) => {
                        outputFormatter.formatDependencyDirection(dd, i)
                    },
                    limit,
                )
            }

            if (options.architecture && repositoryPatternViolations.length > 0) {
                console.log(
                    `\n📦 Found ${String(repositoryPatternViolations.length)} repository pattern violation(s)`,
                )
                outputFormatter.displayGroupedViolations(
                    repositoryPatternViolations,
                    (rp, i) => {
                        outputFormatter.formatRepositoryPattern(rp, i)
                    },
                    limit,
                )
            }

            if (options.architecture && aggregateBoundaryViolations.length > 0) {
                console.log(
                    `\n🔒 Found ${String(aggregateBoundaryViolations.length)} aggregate boundary violation(s)`,
                )
                outputFormatter.displayGroupedViolations(
                    aggregateBoundaryViolations,
                    (ab, i) => {
                        outputFormatter.formatAggregateBoundary(ab, i)
                    },
                    limit,
                )
            }

            if (secretViolations.length > 0) {
                console.log(
                    `\n🔐 Found ${String(secretViolations.length)} hardcoded secret(s) - CRITICAL SECURITY RISK`,
                )
                outputFormatter.displayGroupedViolations(
                    secretViolations,
                    (sv, i) => {
                        outputFormatter.formatSecretViolation(sv, i)
                    },
                    limit,
                )
            }

            if (anemicModelViolations.length > 0) {
                console.log(
                    `\n🩺 Found ${String(anemicModelViolations.length)} anemic domain model(s)`,
                )
                outputFormatter.displayGroupedViolations(
                    anemicModelViolations,
                    (am, i) => {
                        outputFormatter.formatAnemicModelViolation(am, i)
                    },
                    limit,
                )
            }

            if (options.hardcode && hardcodeViolations.length > 0) {
                console.log(
                    `\n${CLI_MESSAGES.HARDCODE_VIOLATIONS_HEADER} ${String(hardcodeViolations.length)} ${CLI_LABELS.HARDCODE_VIOLATIONS}`,
                )
                outputFormatter.displayGroupedViolations(
                    hardcodeViolations,
                    (hc, i) => {
                        outputFormatter.formatHardcodeViolation(hc, i)
                    },
                    limit,
                )
            }

            const totalIssues =
                violations.length +
                hardcodeViolations.length +
                circularDependencyViolations.length +
                namingViolations.length +
                frameworkLeakViolations.length +
                entityExposureViolations.length +
                dependencyDirectionViolations.length +
                repositoryPatternViolations.length +
                aggregateBoundaryViolations.length +
                secretViolations.length +
                anemicModelViolations.length

            statsFormatter.displaySummary(totalIssues, options.verbose)
        } catch (error) {
            statsFormatter.displayError(error instanceof Error ? error.message : String(error))
        }
    })

program.parse()
