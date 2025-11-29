# @samiyev/guardian 🛡️

**Your AI Coding Companion - Keep the Vibe, Ditch the Tech Debt**

Code quality guardian for vibe coders and enterprise teams - because AI writes fast, Guardian keeps it clean.

[![npm version](https://badge.fury.io/js/@samiyev%2Fguardian.svg)](https://www.npmjs.com/package/@samiyev/guardian)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Perfect for:**
> - 🚀 **Vibe Coders**: Ship fast with GitHub Copilot, Cursor, Windsurf, Claude, ChatGPT while maintaining quality
> - 🏢 **Enterprise Teams**: Enforce architectural standards and code quality at scale
> - 📚 **Code Review Automation**: Catch issues before human reviewers see them

## Features

✨ **Hardcode Detection**
- 🔢 Magic numbers (timeouts, ports, limits, etc.)
- 📝 Magic strings (URLs, connection strings, etc.)
- 🎯 Smart context analysis
- 💡 Automatic constant name suggestions
- 📍 Suggested location for constants
- 📚 *Based on: MIT 6.031, SonarQube RSPEC-109, peer-reviewed research* → [Why?](./docs/WHY.md#hardcode-detection)

🔄 **Circular Dependency Detection**
- Detects import cycles in your codebase
- Shows complete dependency chain
- Helps maintain clean architecture
- Prevents maintenance nightmares
- Severity-based reporting
- 📚 *Based on: Martin Fowler's architecture patterns, Shopify Engineering* → [Why?](./docs/WHY.md#circular-dependencies)

📝 **Naming Convention Detection**
- Layer-based naming rules enforcement
- Domain: Entities (PascalCase), Services (*Service), Repositories (I*Repository)
- Application: Use cases (Verb+Noun), DTOs (*Dto/*Request/*Response), Mappers (*Mapper)
- Infrastructure: Controllers (*Controller), Repositories (*Repository), Services (*Service/*Adapter)
- Smart exclusions for base classes
- Helpful fix suggestions
- 📚 *Based on: Google Style Guide, Airbnb JavaScript Style Guide, Microsoft Guidelines* → [Why?](./docs/WHY.md#naming-conventions)

🔌 **Framework Leak Detection**
- Detects framework-specific imports in domain layer
- Identifies HTTP frameworks (Express, Fastify, Koa, Hapi, NestJS)
- Catches ORM/Database leaks (Prisma, TypeORM, Sequelize, Mongoose, Drizzle)
- Detects external service dependencies (AWS SDK, Firebase, Stripe, Twilio)
- Maintains clean domain boundaries
- Prevents infrastructure coupling in business logic
- 📚 *Based on: Hexagonal Architecture (Cockburn 2005), Clean Architecture (Martin 2017)* → [Why?](./docs/WHY.md#framework-leaks)

🎭 **Entity Exposure Detection**
- Detects domain entities exposed in API responses
- Prevents data leakage through direct entity returns
- Enforces DTO/Response object usage
- Layer-aware validation
- Smart suggestions for proper DTOs
- 📚 *Based on: Martin Fowler's Enterprise Patterns (2002)* → [Why?](./docs/WHY.md#entity-exposure)

⬆️ **Dependency Direction Enforcement**
- Validates Clean Architecture layer dependencies
- Domain → Application → Infrastructure flow
- Prevents backwards dependencies
- Maintains architectural boundaries
- Detailed violation reports
- 📚 *Based on: Robert C. Martin's Dependency Rule, SOLID principles* → [Why?](./docs/WHY.md#clean-architecture)

📦 **Repository Pattern Validation**
- Validates repository interface design
- Detects ORM/technical types in interfaces
- Checks for technical method names (findOne, save, etc.)
- Enforces domain language usage
- Prevents "new Repository()" anti-pattern
- 📚 *Based on: Martin Fowler's Repository Pattern, DDD (Evans 2003)* → [Why?](./docs/WHY.md#repository-pattern)

🔒 **Aggregate Boundary Validation**
- Detects direct entity references across DDD aggregates
- Enforces reference-by-ID or Value Object pattern
- Prevents tight coupling between aggregates
- Supports multiple folder structures (domain/aggregates/*, domain/*, domain/entities/*)
- Filters allowed imports (value-objects, events, repositories, services)
- Critical severity for maintaining aggregate independence
- 📚 *Based on: Domain-Driven Design (Evans 2003), Implementing DDD (Vernon 2013)* → [Why?](./docs/WHY.md#aggregate-boundary-validation)

🔐 **Secret Detection** ✨ NEW in v0.8.0
- Detects 350+ types of hardcoded secrets using industry-standard Secretlint
- Catches AWS keys, GitHub tokens, NPM tokens, SSH keys, API keys, and more
- All secrets marked as **CRITICAL severity** - immediate security risk
- Context-aware remediation suggestions for each secret type
- Prevents credentials from reaching version control
- Integrates seamlessly with existing detectors
- 📚 *Based on: OWASP Secrets Management, GitHub Secret Scanning (350+ patterns), security standards* → [Why?](./docs/WHY.md#secret-detection)

🩺 **Anemic Domain Model Detection** ✨ NEW in v0.9.0
- Detects entities with only getters/setters (data bags without behavior)
- Identifies public setters anti-pattern in domain entities
- Calculates methods-to-properties ratio for behavioral analysis
- Enforces rich domain models over anemic models
- Suggests moving business logic from services to entities
- Medium severity - architectural code smell
- 📚 *Based on: Martin Fowler's "Anemic Domain Model" (2003), DDD (Evans 2003), Transaction Script vs Domain Model patterns* → [Why?](./docs/WHY.md#anemic-domain-model-detection)

🎯 **Severity-Based Prioritization**
- Automatic sorting by severity: CRITICAL → HIGH → MEDIUM → LOW
- Filter by severity level: `--only-critical` or `--min-severity high`
- Focus on what matters most: secrets and circular dependencies first
- Visual severity indicators with color-coded labels (🔴🟠🟡🟢)
- Smart categorization based on impact to production
- Enables gradual technical debt reduction
- 📚 *Based on: SonarQube severity classification, IEEE/ScienceDirect research on Technical Debt prioritization* → [Why?](./docs/WHY.md#severity-based-prioritization)

🏗️ **Clean Architecture Enforcement**
- Built with DDD principles
- Layered architecture (Domain, Application, Infrastructure)
- TypeScript with strict type checking
- Fully tested (80%+ coverage)
- Enforces architectural boundaries across teams
- 📚 *Based on: Clean Architecture (Martin 2017), Domain-Driven Design (Evans 2003)* → [Why?](./docs/WHY.md#clean-architecture)

🚀 **Developer & Enterprise Friendly**
- Simple API for developers
- Detailed violation reports with suggestions
- Configurable rules and excludes
- Fast tree-sitter parsing
- CI/CD integration ready
- JSON/Markdown output for automation
- Metrics export for dashboards

🤖 **Built for Vibe Coding**
- ⚡ Your AI writes code → Guardian reviews it → AI fixes issues → Ship it
- 🎯 Catches the #1 AI mistake: hardcoded values everywhere
- 🏗️ Enforces Clean Architecture that AI often ignores
- 💡 Smart suggestions you can feed back to your AI assistant
- 🔄 Closes the feedback loop: better prompts = cleaner AI code
- 🚀 Works with GitHub Copilot, Cursor, Windsurf, Claude, ChatGPT, Cline, and any AI tool

## Why Guardian for Vibe Coding?

**The Problem:** AI assistants (GitHub Copilot, Cursor, Windsurf, Claude, ChatGPT) are incredible at shipping features fast, but they love hardcoding values and sometimes ignore architectural patterns. You're moving fast, but accumulating tech debt.

**The Solution:** Guardian is your quality safety net. Code with AI at full speed, then let Guardian catch the issues before they hit production.

### Real Vibe Coding Workflow

```
1. 🤖 Ask Claude/GPT: "Build me a user authentication service"
   → AI generates 200 lines in 10 seconds

2. 🛡️ Run Guardian: npx @samiyev/guardian check ./src
   → Finds: hardcoded JWT secret, magic timeouts, circular deps

3. 🔄 Feed Guardian's output back to AI: "Fix these 5 issues"
   → AI refactors in 5 seconds with proper constants

4. ✅ Ship clean code in minutes, not hours
```

### What Guardian Catches from AI-Generated Code

**Hardcoded Secrets & Config** (Most Common)
```typescript
// ❌ AI writes this
const jwt = sign(payload, "super-secret-key-123", { expiresIn: 3600 })
app.listen(3000)
setTimeout(retry, 5000)

// ✅ Guardian suggests
const jwt = sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY_SECONDS })
app.listen(DEFAULT_PORT)
setTimeout(retry, RETRY_TIMEOUT_MS)
```

**Architecture Violations**
```typescript
// ❌ AI might do this
// domain/User.ts importing from infrastructure
import { database } from '../infrastructure/database'

// ✅ Guardian catches it
⚠️ Domain layer cannot import from infrastructure
💡 Use dependency injection or repository pattern
```

**Circular Dependencies**
```typescript
// ❌ AI creates these accidentally
UserService → OrderService → UserService

// ✅ Guardian finds the cycle
🔄 Circular dependency detected
💡 Extract shared logic to a common service
```

### Guardian = Your AI's Code Reviewer

Think of Guardian as a senior developer reviewing AI's pull requests:
- ✅ **Fast Feedback**: Instant analysis, no waiting for human review
- ✅ **Consistent Standards**: Same rules every time, no mood swings
- ✅ **Learning Loop**: Use Guardian's suggestions to train your AI prompts
- ✅ **Zero Judgment**: Code fast, refine later, no pressure

### Perfect For These Scenarios

- 🚀 **Prototyping**: Move fast, Guardian catches tech debt before it spreads
- 🤝 **AI Pair Programming**: Claude writes, Guardian reviews, you ship
- 📚 **Learning Clean Architecture**: Guardian teaches patterns as you code
- 🔄 **Refactoring AI Code**: Already have AI-generated code? Guardian audits it
- ⚡ **Startup Speed**: Ship features daily while maintaining quality

---

## Why Guardian for Enterprise Teams?

**The Challenge:** Large codebases with multiple developers, junior devs learning patterns, legacy code, and AI adoption creating inconsistent code quality.

**The Solution:** Guardian enforces your architectural standards automatically - no more manual code review for common issues.

### Enterprise Use Cases

**🏗️ Architectural Governance**
```typescript
// Guardian enforces Clean Architecture rules across teams
// ❌ Domain layer importing from infrastructure? Blocked.
// ❌ Wrong naming conventions? Caught immediately.
// ❌ Circular dependencies? Detected before merge.

// Result: Consistent architecture across 100+ developers
```

**👥 Onboarding & Training**
```typescript
// New developer writes code
// Guardian provides instant feedback with suggestions
// Junior devs learn patterns from Guardian's violations

// Result: Faster onboarding, consistent code quality from day 1
```

**🔒 Security & Compliance**
```typescript
// Guardian catches before production:
// - Hardcoded API keys and secrets
// - Exposed database credentials
// - Magic configuration values

// Result: Prevent security incidents, pass compliance audits
```

**📊 Technical Debt Management**
```typescript
// Track metrics over time:
// - Number of hardcoded values per sprint
// - Architecture violations by team
// - Circular dependency trends

// Result: Data-driven refactoring decisions
```

**🔄 AI Adoption at Scale**
```typescript
// Your team starts using GitHub Copilot/Claude
// Guardian acts as quality gate for AI-generated code
// Developers get instant feedback on AI suggestions

// Result: Leverage AI speed without sacrificing quality
```

### Enterprise Integration

**CI/CD Pipeline**
```yaml
# GitHub Actions / GitLab CI / Jenkins
- name: Guardian Quality Gate
  run: |
    npm install -g @samiyev/guardian
    guardian check ./src --format json > guardian-report.json

    # Fail build if critical violations found
    guardian check ./src --fail-on hardcode --fail-on circular
```

**Pull Request Automation**
```yaml
# Auto-comment on PRs with Guardian findings
- name: PR Guardian Check
  run: |
    guardian check ./src --format markdown | \
      gh pr comment ${{ github.event.pull_request.number }} --body-file -
```

**Pre-commit Hooks (Husky)**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "guardian check --staged --fail-on hardcode"
    }
  }
}
```

**Metrics Dashboard**
```typescript
// Track quality metrics across sprints
import { analyzeProject } from "@samiyev/guardian"

const metrics = await analyzeProject({ projectPath: "./src" })

// Export to your analytics platform
await reportMetrics({
    hardcodedValues: metrics.hardcodeViolations.length,
    circularDeps: metrics.circularDependencyViolations.length,
    architectureViolations: metrics.architectureViolations.length,
    timestamp: Date.now(),
})
```

### Enterprise Benefits

| Benefit | Impact |
|---------|--------|
| **Reduced Code Review Time** | Save 30-40% time on reviewing common issues |
| **Consistent Standards** | All teams follow same architectural patterns |
| **Faster Onboarding** | New devs learn from instant Guardian feedback |
| **Security** | Catch hardcoded secrets before production |
| **AI Enablement** | Safely adopt AI coding tools at scale |
| **Technical Debt Visibility** | Metrics and trends for data-driven decisions |

## Installation

```bash
npm install @samiyev/guardian
# or
pnpm add @samiyev/guardian
# or
yarn add @samiyev/guardian
```

## Quick Start for Vibe Coders

**30-Second Setup:**

```bash
# 1. Install globally for instant use
npm install -g @samiyev/guardian

# 2. Run on your AI-generated code
cd your-project
guardian check ./src

# 3. Copy output and paste into Claude/GPT
# "Here's what Guardian found, please fix these issues"

# 4. Done! Ship it 🚀
```

**Integration with Claude Code / Cursor:**

```typescript
// Add this to your project root: guardian.config.js
module.exports = {
    exclude: ["node_modules", "dist", "build"],
    rules: {
        hardcode: true,        // Catch magic numbers/strings
        architecture: true,    // Enforce Clean Architecture
        circular: true,        // Find circular dependencies
        naming: true,          // Check naming conventions
    },
}

// Then in your AI chat:
// "Before each commit, run: guardian check ./src and fix any issues"
```

## API Quick Start

```typescript
import { analyzeProject } from "@samiyev/guardian"

const result = await analyzeProject({
    projectPath: "./src",
    excludeDirs: ["node_modules", "dist"],
})

console.log(`Found ${result.hardcodeViolations.length} hardcoded values`)
console.log(`Found ${result.secretViolations.length} hardcoded secrets 🔐`)

// Check for critical security issues first!
result.secretViolations.forEach((violation) => {
    console.log(`🔐 CRITICAL: ${violation.file}:${violation.line}`)
    console.log(`  Secret Type: ${violation.secretType}`)
    console.log(`  ${violation.message}`)
    console.log(`  ⚠️  Rotate this secret immediately!`)
})

result.hardcodeViolations.forEach((violation) => {
    console.log(`${violation.file}:${violation.line}`)
    console.log(`  Type: ${violation.type}`)
    console.log(`  Value: ${violation.value}`)
    console.log(`  💡 Suggested: ${violation.suggestedConstantName}`)
    console.log(`  📁 Location: ${violation.suggestedLocation}`)
})
```

### CLI Usage

Guardian can also be used as a command-line tool:

```bash
# Check your project
npx @samiyev/guardian check ./src

# With custom excludes
npx @samiyev/guardian check ./src --exclude node_modules dist build

# Verbose output
npx @samiyev/guardian check ./src --verbose

# Skip specific checks
npx @samiyev/guardian check ./src --no-hardcode  # Skip hardcode detection
npx @samiyev/guardian check ./src --no-architecture  # Skip architecture checks

# Filter by severity (perfect for finding secrets first!)
npx @samiyev/guardian check ./src --only-critical      # Show only critical issues (secrets, circular deps)
npx @samiyev/guardian check ./src --min-severity high  # Show high and critical only

# Limit detailed output (useful for large codebases)
npx @samiyev/guardian check ./src --limit 10           # Show first 10 violations per category
npx @samiyev/guardian check ./src -l 20                # Short form

# Combine options
npx @samiyev/guardian check ./src --only-critical --limit 5  # Top 5 critical issues

# Show help
npx @samiyev/guardian --help

# Show version
npx @samiyev/guardian --version
```

**Example output:**

```
🛡️  Guardian - Analyzing your code...

📊 Project Metrics:
   Files analyzed: 45
   Total functions: 128
   Total imports: 234

📦 Layer Distribution:
   domain: 12 files
   application: 8 files
   infrastructure: 15 files
   shared: 10 files

⚠️  Found 2 architecture violations:

1. src/domain/services/UserService.ts
   Rule: clean-architecture
   Layer "domain" cannot import from "infrastructure"

🔄 Found 1 circular dependencies:

1. Circular dependency detected: src/services/UserService.ts → src/services/OrderService.ts → src/services/UserService.ts
   Severity: error
   Cycle path:
     1. src/services/UserService.ts
     2. src/services/OrderService.ts
     3. src/services/UserService.ts (back to start)

📝 Found 3 naming convention violations:

1. src/application/use-cases/user.ts
   Rule: naming-convention
   Layer: application
   Type: wrong-verb-noun
   Expected: Verb + Noun in PascalCase (CreateUser.ts, UpdateProfile.ts)
   Actual: user.ts
   💡 Suggestion: Start with a verb like: Analyze, Create, Update, Delete, Get

2. src/domain/UserDto.ts
   Rule: naming-convention
   Layer: domain
   Type: forbidden-pattern
   Expected: PascalCase noun (User.ts, Order.ts)
   Actual: UserDto.ts
   💡 Suggestion: Move to application or infrastructure layer, or rename to follow domain patterns

🔍 Found 5 hardcoded values:

1. src/api/server.ts:15:20
   Type: magic-number
   Value: 3000
   Context: app.listen(3000)
   💡 Suggested: DEFAULT_PORT
   📁 Location: infrastructure/config

2. src/services/auth.ts:42:35
   Type: magic-string
   Value: "http://localhost:8080"
   Context: const apiUrl = "http://localhost:8080"
   💡 Suggested: API_BASE_URL
   📁 Location: shared/constants

❌ Found 7 issues total

💡 Tip: Fix these issues to improve code quality and maintainability.
```

## API

### `analyzeProject(options)`

Analyzes a project for code quality issues.

#### Options

```typescript
interface AnalyzeProjectRequest {
    projectPath: string // Path to analyze
    excludeDirs?: string[] // Directories to exclude
}
```

#### Response

```typescript
interface AnalyzeProjectResponse {
    // Violations
    hardcodeViolations: HardcodeViolation[]
    violations: ArchitectureViolation[]
    circularDependencyViolations: CircularDependencyViolation[]
    namingViolations: NamingViolation[]
    frameworkLeakViolations: FrameworkLeakViolation[]
    entityExposureViolations: EntityExposureViolation[]
    dependencyDirectionViolations: DependencyDirectionViolation[]
    repositoryPatternViolations: RepositoryPatternViolation[]

    // Metrics
    metrics: ProjectMetrics
}

interface HardcodeViolation {
    file: string
    line: number
    column: number
    type: "magic-number" | "magic-string"
    value: string | number
    context: string
    severity: "critical" | "high" | "medium" | "low"
    suggestion: {
        constantName: string
        location: string
    }
}

interface CircularDependencyViolation {
    rule: "circular-dependency"
    message: string
    cycle: string[]
    severity: "critical" | "high" | "medium" | "low"
}

interface NamingViolation {
    file: string
    fileName: string
    layer: string
    type: string
    message: string
    suggestion?: string
    severity: "critical" | "high" | "medium" | "low"
}

interface FrameworkLeakViolation {
    file: string
    packageName: string
    category: string
    categoryDescription: string
    layer: string
    rule: string
    message: string
    suggestion: string
    severity: "critical" | "high" | "medium" | "low"
}

interface EntityExposureViolation {
    file: string
    line?: number
    entityName: string
    returnType: string
    methodName?: string
    layer: string
    rule: string
    message: string
    suggestion: string
    severity: "critical" | "high" | "medium" | "low"
}

interface DependencyDirectionViolation {
    file: string
    fromLayer: string
    toLayer: string
    importPath: string
    message: string
    suggestion: string
    severity: "critical" | "high" | "medium" | "low"
}

interface RepositoryPatternViolation {
    file: string
    layer: string
    violationType: string
    details: string
    message: string
    suggestion: string
    severity: "critical" | "high" | "medium" | "low"
}

interface ProjectMetrics {
    totalFiles: number
    totalFunctions: number
    totalImports: number
    layerDistribution: Record<string, number>
}
```

## What Gets Detected?

### Magic Numbers

```typescript
// ❌ Detected
setTimeout(() => {}, 5000)
const maxRetries = 3
const port = 8080

// ✅ Not detected (allowed numbers: -1, 0, 1, 2, 10, 100, 1000)
const items = []
const index = 0
const increment = 1

// ✅ Not detected (exported constants)
export const CONFIG = {
    timeout: 5000,
    port: 8080,
} as const
```

### Magic Strings

```typescript
// ❌ Detected
const url = "http://localhost:8080"
const dbUrl = "mongodb://localhost:27017/db"

// ✅ Not detected
console.log("debug message") // console logs ignored
import { foo } from "bar" // imports ignored
test("should work", () => {}) // tests ignored

// ✅ Not detected (exported constants)
export const API_CONFIG = {
    baseUrl: "http://localhost",
} as const
```

### Circular Dependencies

```typescript
// ❌ Detected - Simple cycle
// UserService.ts
import { OrderService } from './OrderService'
export class UserService {
    constructor(private orderService: OrderService) {}
}

// OrderService.ts
import { UserService } from './UserService'  // Circular!
export class OrderService {
    constructor(private userService: UserService) {}
}

// ✅ Fixed - Use interfaces or events
// UserService.ts
import { IOrderService } from './interfaces/IOrderService'
export class UserService {
    constructor(private orderService: IOrderService) {}
}

// OrderService.ts
import { IUserService } from './interfaces/IUserService'
export class OrderService implements IOrderService {
    constructor(private userService: IUserService) {}
}
```

### Naming Conventions

Guardian enforces Clean Architecture naming patterns based on the layer:

```typescript
// ❌ Domain Layer - Wrong names
// domain/userDto.ts - DTOs don't belong in domain
// domain/UserController.ts - Controllers don't belong in domain
// domain/user.ts - Should be PascalCase

// ✅ Domain Layer - Correct names
// domain/entities/User.ts - PascalCase noun
// domain/entities/Order.ts - PascalCase noun
// domain/services/UserService.ts - *Service suffix
// domain/repositories/IUserRepository.ts - I*Repository prefix
// domain/value-objects/Email.ts - PascalCase noun

// ❌ Application Layer - Wrong names
// application/use-cases/user.ts - Should start with verb
// application/use-cases/User.ts - Should start with verb
// application/dtos/userDto.ts - Should be PascalCase

// ✅ Application Layer - Correct names
// application/use-cases/CreateUser.ts - Verb + Noun
// application/use-cases/UpdateProfile.ts - Verb + Noun
// application/use-cases/AnalyzeProject.ts - Verb + Noun
// application/dtos/UserDto.ts - *Dto suffix
// application/dtos/CreateUserRequest.ts - *Request suffix
// application/mappers/UserMapper.ts - *Mapper suffix

// ❌ Infrastructure Layer - Wrong names
// infrastructure/controllers/userController.ts - Should be PascalCase
// infrastructure/repositories/user.ts - Should have *Repository suffix

// ✅ Infrastructure Layer - Correct names
// infrastructure/controllers/UserController.ts - *Controller suffix
// infrastructure/repositories/MongoUserRepository.ts - *Repository suffix
// infrastructure/services/EmailService.ts - *Service suffix
// infrastructure/adapters/S3StorageAdapter.ts - *Adapter suffix
```

**Supported Use Case Verbs:**
Analyze, Create, Update, Delete, Get, Find, List, Search, Validate, Calculate, Generate, Send, Fetch, Process, Execute, Handle, Register, Authenticate, Authorize, Import, Export, Place, Cancel, Approve, Reject, Confirm

## Examples

Guardian includes comprehensive examples of good and bad architecture patterns in the `examples/` directory:

**Good Architecture Examples** (29 files):
- **Domain Layer**: Aggregates (User, Order), Entities, Value Objects (Email, Money), Domain Events, Domain Services, Factories, Specifications, Repository Interfaces
- **Application Layer**: Use Cases (CreateUser, PlaceOrder), DTOs, Mappers
- **Infrastructure Layer**: Repository Implementations, Controllers

**Bad Architecture Examples** (7 files):
- Hardcoded values, Circular dependencies, Framework leaks, Entity exposure, Naming violations

Use these examples to:
- Learn Clean Architecture + DDD patterns
- Test Guardian's detection capabilities
- Use as templates for your own projects
- See both correct and incorrect implementations side-by-side

See `examples/README.md` and `examples/SUMMARY.md` for detailed documentation.

## Smart Suggestions

Guardian analyzes context to suggest meaningful constant names:

```typescript
// timeout → TIMEOUT_MS
setTimeout(() => {}, 5000)

// retry → MAX_RETRIES
const maxRetries = 3

// port → DEFAULT_PORT
const port = 8080

// http:// → API_BASE_URL
const url = "http://localhost"
```

## Use Cases

### CI/CD Integration

```typescript
import { analyzeProject } from "@samiyev/guardian"

const result = await analyzeProject({ projectPath: "./src" })

if (result.hardcodeViolations.length > 0) {
    console.error(`Found ${result.hardcodeViolations.length} hardcoded values`)
    process.exit(1)
}
```

### Pre-commit Hook

```json
{
    "husky": {
        "hooks": {
            "pre-commit": "node scripts/check-hardcodes.js"
        }
    }
}
```

### Custom Analyzer

```typescript
import { HardcodeDetector } from "@samiyev/guardian"

const detector = new HardcodeDetector()
const code = `const timeout = 5000`

const violations = detector.detectAll(code, "file.ts")
// [{ value: 5000, type: "magic-number", ... }]
```

## Vibe Coding Integration Patterns

### Pattern 1: AI Feedback Loop (Recommended)

Use Guardian's output to guide your AI assistant:

```bash
# 1. Generate code with AI
# (Ask Claude: "Create a REST API with user authentication")

# 2. Run Guardian
npx @samiyev/guardian check ./src > guardian-report.txt

# 3. Feed back to AI
# (Show Claude the report: "Fix these issues Guardian found")

# 4. Verify fixes
npx @samiyev/guardian check ./src
```

### Pattern 2: Pre-Commit Quality Gate

Catch issues before they hit your repo:

```bash
# .husky/pre-commit
#!/bin/sh
npx @samiyev/guardian check ./src

if [ $? -ne 0 ]; then
  echo "❌ Guardian found issues. Fix them or commit with --no-verify"
  exit 1
fi
```

### Pattern 3: CI/CD for AI Projects

Add to your GitHub Actions or GitLab CI:

```yaml
# .github/workflows/ai-quality-check.yml
name: AI Code Quality

on: [push, pull_request]

jobs:
  guardian-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g @samiyev/guardian
      - run: guardian check ./src
```

### Pattern 4: Interactive Development

Watch mode for real-time feedback as AI generates code:

```bash
# Terminal 1: AI generates code
# (You're chatting with Claude/GPT)

# Terminal 2: Guardian watches for changes
while true; do
  clear
  npx @samiyev/guardian check ./src --no-exit
  sleep 2
done
```

### Pattern 5: Training Your AI

Use Guardian to create better prompts:

```markdown
**Before (Generic prompt):**
"Create a user service with CRUD operations"

**After (Guardian-informed prompt):**
"Create a user service with CRUD operations. Follow these rules:
- No hardcoded values (use constants from shared/constants)
- Follow Clean Architecture (domain/application/infrastructure layers)
- Name use cases as VerbNoun (e.g., CreateUser.ts)
- No circular dependencies
- Export all configuration as constants"

Result: AI generates cleaner code from the start!
```

## Advanced Usage

### Using Individual Services

```typescript
import {
    FileScanner,
    CodeParser,
    HardcodeDetector,
} from "@samiyev/guardian"

// Scan files
const scanner = new FileScanner()
const files = await scanner.scanDirectory("./src", {
    exclude: ["node_modules"],
    extensions: [".ts", ".tsx"],
})

// Parse code
const parser = new CodeParser()
const tree = parser.parseTypeScript(code)
const functions = parser.extractFunctions(tree)

// Detect hardcodes
const detector = new HardcodeDetector()
const violations = detector.detectAll(code, "file.ts")
```

## Architecture

Guardian follows Clean Architecture principles:

```
@samiyev/guardian/
├── domain/           # Business logic & interfaces
│   ├── entities/     # BaseEntity, SourceFile
│   ├── value-objects/# HardcodedValue, ProjectPath
│   ├── services/     # ICodeParser, IHardcodeDetector
│   └── repositories/ # IRepository
├── application/      # Use cases
│   └── use-cases/    # AnalyzeProject
├── infrastructure/   # External services
│   ├── parsers/      # CodeParser (tree-sitter)
│   ├── scanners/     # FileScanner
│   └── analyzers/    # HardcodeDetector
└── api/              # Public API
    └── analyzeProject()
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for TypeScript projects)

## FAQ for Vibe Coders

**Q: Will Guardian slow down my AI workflow?**
A: No! Run it after AI generates code, not during. Analysis takes 1-2 seconds for most projects.

**Q: Can I use this with any AI coding assistant?**
A: Yes! Works with GitHub Copilot, Cursor, Windsurf, Claude, ChatGPT, Cline, or any tool that generates TypeScript/JavaScript.

**Q: Does Guardian replace ESLint/Prettier?**
A: No, it complements them. ESLint checks syntax, Guardian checks architecture and hardcodes.

**Q: What if I'm just prototyping?**
A: Perfect use case! Guardian helps you identify tech debt so you can decide what to fix before production.

**Q: Can AI fix Guardian's findings automatically?**
A: Yes! Copy Guardian's output, paste into Claude, ChatGPT, or your AI assistant with "fix these issues", and watch the magic.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

Built with ❤️ for the vibe coding community.

## License

MIT © Fozilbek Samiyev

## Links

- [Official Website](https://puaros.ailabs.uz)
- [GitHub Repository](https://github.com/samiyev/puaros)
- [Issues](https://github.com/samiyev/puaros/issues)
- [Changelog](https://github.com/samiyev/puaros/blob/main/CHANGELOG.md)
