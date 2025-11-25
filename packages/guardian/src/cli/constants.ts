/**
 * CLI Constants
 *
 * Following Clean Code principles:
 * - No magic strings
 * - Single source of truth
 * - Easy to maintain and translate
 */

export const CLI_COMMANDS = {
    NAME: "guardian",
    CHECK: "check",
} as const

export const CLI_DESCRIPTIONS = {
    MAIN:
        "🛡️  Guardian - Code quality analyzer for TypeScript/JavaScript projects\n\n" +
        "DETECTS:\n" +
        "  • Hardcoded values (magic numbers/strings) - extract to constants\n" +
        "  • Circular dependencies - refactor module structure\n" +
        "  • Framework leaks in domain - move framework imports to infrastructure\n" +
        "  • Naming violations - rename files to match layer conventions\n" +
        "  • Architecture violations - respect Clean Architecture layers\n" +
        "  • Entity exposure - use DTOs instead of returning entities\n" +
        "  • Dependency direction - ensure dependencies flow inward\n" +
        "  • Repository pattern - enforce repository interfaces in domain\n\n" +
        "SEVERITY LEVELS:\n" +
        "  🔴 CRITICAL - Must fix immediately (breaks architecture)\n" +
        "  🟠 HIGH     - Should fix soon (major quality issue)\n" +
        "  🟡 MEDIUM   - Should fix (moderate quality issue)\n" +
        "  🟢 LOW      - Nice to fix (minor quality issue)\n\n" +
        "BACKED BY RESEARCH:\n" +
        "  Guardian's rules are based on established software engineering principles\n" +
        "  from MIT, Martin Fowler, Robert C. Martin, and industry standards.\n" +
        "  Learn more: https://github.com/samiyev/puaros/blob/main/packages/guardian/docs/WHY.md",
    CHECK:
        "Analyze project for code quality and architecture issues\n\n" +
        "WORKFLOW:\n" +
        "  1. Run: guardian check ./src\n" +
        "  2. Review violations by severity\n" +
        "  3. Read the suggestion for each violation\n" +
        "  4. Fix violations starting with CRITICAL\n" +
        "  5. Re-run to verify fixes",
    PATH_ARG: "Path to analyze (e.g., ./src or ./packages/api)",
    EXCLUDE_OPTION:
        "Exclude dirs/patterns (default: node_modules,dist,build,coverage,tests,**/*.test.ts)",
    VERBOSE_OPTION: "Show additional help and analysis details",
    NO_HARDCODE_OPTION: "Skip hardcode detection (only check architecture)",
    NO_ARCHITECTURE_OPTION: "Skip architecture checks (only check hardcodes)",
    MIN_SEVERITY_OPTION: "Filter by severity: critical|high|medium|low (e.g., --min-severity high)",
    ONLY_CRITICAL_OPTION: "Show only 🔴 CRITICAL issues (shortcut for --min-severity critical)",
    LIMIT_OPTION: "Limit violations shown per category (e.g., -l 10 shows first 10)",
} as const

export const CLI_OPTIONS = {
    EXCLUDE: "-e, --exclude <dirs...>",
    VERBOSE: "-v, --verbose",
    NO_HARDCODE: "--no-hardcode",
    NO_ARCHITECTURE: "--no-architecture",
    MIN_SEVERITY: "--min-severity <level>",
    ONLY_CRITICAL: "--only-critical",
    LIMIT: "-l, --limit <number>",
} as const

export const SEVERITY_DISPLAY_LABELS = {
    CRITICAL: "🔴 CRITICAL",
    HIGH: "🟠 HIGH",
    MEDIUM: "🟡 MEDIUM",
    LOW: "🟢 LOW",
} as const

export const SEVERITY_SECTION_HEADERS = {
    CRITICAL:
        "\n═══════════════════════════════════════════\n🔴 CRITICAL SEVERITY\n═══════════════════════════════════════════",
    HIGH: "\n═══════════════════════════════════════════\n🟠 HIGH SEVERITY\n═══════════════════════════════════════════",
    MEDIUM: "\n═══════════════════════════════════════════\n🟡 MEDIUM SEVERITY\n═══════════════════════════════════════════",
    LOW: "\n═══════════════════════════════════════════\n🟢 LOW SEVERITY\n═══════════════════════════════════════════",
} as const

export const CLI_ARGUMENTS = {
    PATH: "<path>",
} as const

export const DEFAULT_EXCLUDES = [
    "node_modules",
    "dist",
    "build",
    "coverage",
    "tests",
    "test",
    "__tests__",
    "examples",
    "**/*.test.ts",
    "**/*.test.js",
    "**/*.spec.ts",
    "**/*.spec.js",
] as const

export const CLI_MESSAGES = {
    ANALYZING: "\n🛡️  Guardian - Analyzing your code...\n",
    METRICS_HEADER: "📊 Project Metrics:",
    LAYER_DISTRIBUTION_HEADER: "\n📦 Layer Distribution:",
    VIOLATIONS_HEADER: "\n⚠️  Found",
    CIRCULAR_DEPS_HEADER: "\n🔄 Found",
    NAMING_VIOLATIONS_HEADER: "\n📝 Found",
    HARDCODE_VIOLATIONS_HEADER: "\n🔍 Found",
    NO_ISSUES: "\n✅ No issues found! Your code looks great!",
    ISSUES_TOTAL: "\n❌ Found",
    TIP: "\n💡 Tip: Fix these issues to improve code quality and maintainability.\n",
    HELP_FOOTER: "\nRun with --help for more options",
    ERROR_PREFIX: "Error analyzing project:",
} as const

export const CLI_LABELS = {
    FILES_ANALYZED: "Files analyzed:",
    TOTAL_FUNCTIONS: "Total functions:",
    TOTAL_IMPORTS: "Total imports:",
    FILES: "files",
    ARCHITECTURE_VIOLATIONS: "architecture violations:",
    CIRCULAR_DEPENDENCIES: "circular dependencies:",
    NAMING_VIOLATIONS: "naming convention violations:",
    HARDCODE_VIOLATIONS: "hardcoded values:",
    ISSUES_TOTAL: "issues total",
} as const

export const CLI_HELP_TEXT = {
    POSITION: "after",
    EXAMPLES_HEADER: "\nEXAMPLES:\n",
    EXAMPLE_BASIC: "  $ guardian check ./src                          # Analyze src directory\n",
    EXAMPLE_CRITICAL:
        "  $ guardian check ./src --only-critical          # Show only critical issues\n",
    EXAMPLE_SEVERITY:
        "  $ guardian check ./src --min-severity high      # Show high and critical\n",
    EXAMPLE_LIMIT:
        "  $ guardian check ./src --limit 10               # Limit output to 10 per category\n",
    EXAMPLE_NO_HARDCODE:
        "  $ guardian check ./src --no-hardcode            # Skip hardcode detection\n",
    EXAMPLE_NO_ARCHITECTURE:
        "  $ guardian check ./src --no-architecture        # Skip architecture checks\n",
    EXAMPLE_EXCLUDE:
        "  $ guardian check ./src -e dist build            # Exclude additional dirs\n\n",
    FIX_HEADER: "HOW TO FIX COMMON ISSUES:\n",
    FIX_HARDCODE: "  Hardcoded values    → Extract to constants file\n",
    FIX_CIRCULAR: "  Circular deps       → Break cycle by extracting shared code\n",
    FIX_FRAMEWORK: "  Framework leaks     → Move Express/NestJS imports to infrastructure layer\n",
    FIX_NAMING: "  Naming violations   → Rename file (e.g., UserEntity.ts, CreateUserUseCase.ts)\n",
    FIX_ENTITY: "  Entity exposure     → Create DTO and map entity to DTO before returning\n",
    FIX_DEPENDENCY:
        "  Dependency direction → Move import to correct layer (domain ← app ← infra)\n",
    FIX_REPOSITORY:
        "  Repository pattern  → Create IUserRepository in domain, implement in infra\n\n",
    FOOTER: "Each violation includes a 💡 Suggestion with specific fix instructions.\n",
    AI_AGENT_HEADER: "AI AGENT INSTRUCTIONS:\n",
    AI_AGENT_INTRO:
        "  When an AI coding assistant (Claude, Copilot, Cursor, etc.) uses Guardian:\n\n",
    AI_AGENT_STEP1: "  STEP 1: Run initial scan\n",
    AI_AGENT_STEP1_CMD: "    $ guardian check ./src --only-critical --limit 5\n\n",
    AI_AGENT_STEP2: "  STEP 2: For each violation in output:\n",
    AI_AGENT_STEP2_DETAIL:
        "    - Read the file at reported location (file:line:column)\n" +
        "    - Apply the 💡 Suggestion provided\n" +
        "    - The suggestion contains exact fix instructions\n\n",
    AI_AGENT_STEP3: "  STEP 3: After fixing, verify:\n",
    AI_AGENT_STEP3_CMD: "    $ guardian check ./src --only-critical\n\n",
    AI_AGENT_STEP4: "  STEP 4: Expand scope progressively:\n",
    AI_AGENT_STEP4_CMDS:
        "    $ guardian check ./src --min-severity high    # Fix HIGH issues\n" +
        "    $ guardian check ./src --min-severity medium  # Fix MEDIUM issues\n" +
        "    $ guardian check ./src                        # Full scan\n\n",
    AI_AGENT_OUTPUT: "  OUTPUT FORMAT (parse this):\n",
    AI_AGENT_OUTPUT_DETAIL:
        "    <index>. <file>:<line>:<column>\n" +
        "       Severity: <emoji> <LEVEL>\n" +
        "       Type: <violation-type>\n" +
        "       Value: <problematic-value>\n" +
        "       Context: <code-snippet>\n" +
        "       💡 Suggestion: <exact-fix-instruction>\n\n",
    AI_AGENT_PRIORITY: "  PRIORITY ORDER: CRITICAL → HIGH → MEDIUM → LOW\n\n",
} as const
