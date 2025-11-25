# Guardian Roadmap 🗺️

This document outlines the current features and future plans for @puaros/guardian.

## Current Version: 0.7.5 ✅ RELEASED

**Released:** 2025-11-25

### Features Included in 0.1.0

**✨ Core Detection:**
- ✅ Hardcode detection (magic numbers, magic strings)
- ✅ Circular dependency detection
- ✅ Naming convention enforcement (layer-based rules)
- ✅ Architecture violations (Clean Architecture layers)
- ✅ Framework leak detection (domain importing frameworks)

**🛠️ Developer Tools:**
- ✅ CLI interface with `guardian check` command
- ✅ Smart constant name suggestions
- ✅ Layer distribution analysis
- ✅ Detailed violation reports with file:line:column
- ✅ Context snippets for each issue

**📚 Documentation & Examples:**
- ✅ AI-focused documentation (vibe coding + enterprise)
- ✅ Comprehensive examples (38 files: 29 good + 9 bad patterns)
- ✅ DDD/Clean Architecture templates
- ✅ Quick start guides
- ✅ Integration examples (CI/CD, pre-commit hooks)

**🧪 Quality:**
- ✅ 194 tests across 7 test files (all passing)
- ✅ 80%+ code coverage on all metrics
- ✅ Self-analysis: 0 violations (100% clean codebase)
- ✅ Extracted constants for better maintainability

**🎯 Built For:**
- ✅ Vibe coders using AI assistants (GitHub Copilot, Cursor, Windsurf, Claude, ChatGPT, Cline)
- ✅ Enterprise teams enforcing architectural standards
- ✅ Code review automation

---

## Version 0.3.0 - Entity Exposure Detection 🎭 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** HIGH

Prevent domain entities from leaking to API responses:

```typescript
// ❌ Bad: Domain entity exposed!
async getUser(id: string): Promise<User> {
    return this.userService.findById(id)
}

// ✅ Good: Use DTOs and Mappers
async getUser(id: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(id)
    return UserMapper.toDto(user)
}
```

**Implemented Features:**
- ✅ Analyze return types in controllers/routes
- ✅ Check if returned type is from domain/entities
- ✅ Suggest using DTOs and Mappers
- ✅ Examples of proper DTO usage
- ✅ 24 tests covering all scenarios

---

## Version 0.4.0 - Dependency Direction Enforcement 🎯 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** HIGH

Enforce correct dependency direction between architectural layers:

```typescript
// ❌ BAD: Wrong dependency direction
// domain/entities/User.ts
import { UserDto } from '../../application/dtos/UserDto'  // VIOLATION!

// domain/services/UserService.ts
import { PrismaClient } from '../../infrastructure/database'  // VIOLATION!

// ✅ GOOD: Correct dependency direction
// infrastructure/controllers/UserController.ts
import { CreateUser } from '../../application/use-cases/CreateUser'  // OK
import { UserResponseDto } from '../../application/dtos/UserResponseDto'  // OK

// application/use-cases/CreateUser.ts
import { IUserRepository } from '../../domain/repositories/IUserRepository'  // OK
import { User } from '../../domain/entities/User'  // OK
```

**Dependency Rules:**
- ✅ Domain → никуда (только внутри domain)
- ✅ Application → Domain (разрешено)
- ✅ Infrastructure → Application, Domain (разрешено)
- ✅ Shared → используется везде

**Implemented Features:**
- ✅ Detect domain importing from application
- ✅ Detect domain importing from infrastructure
- ✅ Detect application importing from infrastructure
- ✅ Detect violations in all import formats (ES6, require)
- ✅ Provide detailed error messages with suggestions
- ✅ Show example fixes for each violation type
- ✅ 43 tests covering all dependency scenarios
- ✅ Good and bad examples in examples directory

---

## Version 0.5.0 - Repository Pattern Validation 📚 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** HIGH

Validate correct implementation of Repository Pattern:

```typescript
// ❌ BAD: ORM-specific interface
// domain/repositories/IUserRepository.ts
interface IUserRepository {
    findOne(query: { where: { id: string } })  // VIOLATION! Prisma-specific
    create(data: UserCreateInput)  // VIOLATION! ORM types in domain
}

// ✅ GOOD: Clean domain interface
interface IUserRepository {
    findById(id: UserId): Promise<User | null>
    save(user: User): Promise<void>
    delete(id: UserId): Promise<void>
}

// ❌ BAD: Use Case with concrete implementation
class CreateUser {
    constructor(private prisma: PrismaClient) {}  // VIOLATION!
}

// ✅ GOOD: Use Case with interface
class CreateUser {
    constructor(private userRepo: IUserRepository) {}  // OK
}
```

**Implemented Features:**
- ✅ Check repository interfaces for ORM-specific types (Prisma, TypeORM, Mongoose, Sequelize, etc.)
- ✅ Detect concrete repository usage in use cases
- ✅ Detect `new Repository()` in use cases (should use DI)
- ✅ Validate repository methods follow domain language
- ✅ 31 tests covering all repository pattern scenarios
- ✅ 96.77% statement coverage, 83.82% branch coverage
- ✅ Examples for both good and bad patterns
- ✅ Comprehensive README with patterns and principles

---

## Version 0.5.2 - Severity-Based Prioritization 🎯 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** HIGH

Intelligently prioritize violations by severity to help teams focus on critical issues first:

```bash
# Show only critical issues
guardian check src --only-critical

# Show high severity and above
guardian check src --min-severity high
```

**Severity Levels:**
- 🔴 **CRITICAL**: Circular dependencies, Repository pattern violations
- 🟠 **HIGH**: Dependency direction violations, Framework leaks, Entity exposures
- 🟡 **MEDIUM**: Naming violations, Architecture violations
- 🟢 **LOW**: Hardcoded values

**Implemented Features:**
- ✅ Automatic sorting by severity (most critical first)
- ✅ CLI flags: `--min-severity <level>` and `--only-critical`
- ✅ Color-coded severity labels in output (🔴🟠🟡🟢)
- ✅ Visual severity group headers with separators
- ✅ Filtering messages when filters active
- ✅ All violation interfaces include severity field
- ✅ 292 tests passing with 90%+ coverage
- ✅ Backwards compatible - no breaking changes

**Benefits:**
- Focus on critical architectural violations first
- Gradual technical debt reduction
- Better CI/CD integration (fail on critical only)
- Improved developer experience with visual prioritization

---

## Version 0.6.0 - Output Limit Control & ESLint Optimization 🎯 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** MEDIUM

Control output verbosity for large codebases and achieve perfect code quality:

```bash
# Limit detailed output for large codebases
guardian check src --limit 10

# Combine with severity filters
guardian check src --only-critical --limit 5

# Short form
guardian check src -l 20
```

**Implemented Features:**
- ✅ `--limit` option to control detailed violation output per category
- ✅ Short form `-l <number>` for convenience
- ✅ Works seamlessly with `--only-critical` and `--min-severity` filters
- ✅ Warning message when violations exceed limit
- ✅ Full statistics always displayed at the end
- ✅ Severity display constants extracted (`SEVERITY_DISPLAY_LABELS`, `SEVERITY_SECTION_HEADERS`)
- ✅ ESLint configuration optimized (reduced warnings from 129 to 0)
- ✅ CLI-specific overrides for no-console, complexity, max-lines-per-function
- ✅ Dead code removal (unused IBaseRepository interface)
- ✅ Complete development workflow added to CLAUDE.md
- ✅ 292 tests passing with 90.63% coverage
- ✅ Guardian self-check: ✅ 0 issues found

**Benefits:**
- Better experience with large codebases
- Faster CI/CD output
- Improved CLI maintainability with constants
- Perfect ESLint score (0 errors, 0 warnings)
- Guardian now passes its own quality checks

---

## Version 0.5.1 - Code Quality Refactoring 🧹 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** MEDIUM

Internal refactoring to eliminate hardcoded values and improve maintainability:

**Implemented Features:**
- ✅ Extracted 30+ constants from hardcoded strings
- ✅ New constants files: paths.ts, extended Messages.ts
- ✅ Reduced hardcoded values from 37 to 1 (97% improvement)
- ✅ Guardian passes its own checks (0 violations in src/)
- ✅ All 292 tests passing
- ✅ No breaking changes - fully backwards compatible

---

## Version 0.7.0 - Aggregate Boundary Validation 🔒 ✅ RELEASED

**Released:** 2025-11-24
**Priority:** CRITICAL

Validate aggregate boundaries in DDD:

```typescript
// ❌ BAD: Direct entity reference across aggregates
// domain/aggregates/order/Order.ts
import { User } from '../user/User'  // VIOLATION!

class Order {
    constructor(private user: User) {}  // Cross-aggregate reference
}

// ✅ GOOD: Reference by ID
class Order {
    constructor(private userId: UserId) {}  // OK: Only ID
}

// ✅ GOOD: Use Value Object
import { UserId } from '../user/value-objects/UserId'

class Order {
    constructor(private userId: UserId) {}  // OK
}
```

**Implemented Features:**
- ✅ Detect entity references across aggregates
- ✅ Allow only ID or Value Object references from other aggregates
- ✅ Filter allowed imports (value-objects, events, repositories, services)
- ✅ Support for multiple aggregate folder structures (domain/aggregates/name, domain/name, domain/entities/name)
- ✅ 41 comprehensive tests with 100% pass rate
- ✅ Examples of good and bad patterns
- ✅ CLI output with 🔒 icon and detailed violation info
- ✅ Critical severity level for aggregate boundary violations

---

## Future Roadmap

---

### Version 0.7.5 - Refactor AnalyzeProject Use-Case 🔧 ✅ RELEASED

**Released:** 2025-11-25
**Priority:** HIGH
**Scope:** Single session (~128K tokens)

Split `AnalyzeProject.ts` (615 lines) into focused pipeline components.

**Problem:**
- God Use-Case with 615 lines
- Mixing: file scanning, parsing, detection, aggregation
- Hard to test and modify individual steps

**Solution:**
```
application/use-cases/
├── AnalyzeProject.ts          # Orchestrator (245 lines)
├── pipeline/
│   ├── FileCollectionStep.ts  # File scanning (66 lines)
│   ├── ParsingStep.ts         # AST + dependency graph (51 lines)
│   ├── DetectionPipeline.ts   # All 7 detectors (371 lines)
│   └── ResultAggregator.ts    # Build response DTO (81 lines)
```

**Deliverables:**
- ✅ Extract 4 pipeline components
- ✅ Reduce `AnalyzeProject.ts` from 615 to 245 lines (60% reduction)
- ✅ All 345 tests pass, no breaking changes
- ✅ Publish to npm

---

### Version 0.7.6 - Refactor CLI Module 🔧 ✅ RELEASED

**Released:** 2025-11-25
**Priority:** MEDIUM
**Scope:** Single session (~128K tokens)

Split `cli/index.ts` (484 lines) into focused formatters.

**Problem:**
- CLI file has 484 lines
- Mixing: command setup, formatting, grouping, statistics

**Solution:**
```
cli/
├── index.ts                  # Commands only (260 lines)
├── formatters/
│   ├── OutputFormatter.ts    # Violation formatting (190 lines)
│   └── StatisticsFormatter.ts # Metrics & summary (58 lines)
├── groupers/
│   └── ViolationGrouper.ts   # Sorting & grouping (29 lines)
```

**Deliverables:**
- ✅ Extract formatters and groupers
- ✅ Reduce `cli/index.ts` from 484 to 260 lines (46% reduction)
- ✅ CLI output identical to before
- ✅ All 345 tests pass, no breaking changes
- ✅ Publish to npm

---

### Version 0.7.7 - Improve Test Coverage 🧪 ✅ RELEASED

**Released:** 2025-11-25
**Priority:** MEDIUM
**Scope:** Single session (~128K tokens)

Increase coverage for under-tested domain files.

**Results:**
| File | Before | After |
|------|--------|-------|
| SourceFile.ts | 46% | 100% ✅ |
| ProjectPath.ts | 50% | 100% ✅ |
| ValueObject.ts | 25% | 100% ✅ |
| RepositoryViolation.ts | 58% | 92.68% ✅ |

**Deliverables:**
- ✅ SourceFile.ts → 100% (31 tests)
- ✅ ProjectPath.ts → 100% (31 tests)
- ✅ ValueObject.ts → 100% (18 tests)
- ✅ RepositoryViolation.ts → 92.68% (32 tests)
- ✅ All 457 tests passing
- ✅ Overall coverage: 95.4% statements, 86.25% branches, 96.68% functions
- ✅ Publish to npm

---

### Version 0.7.8 - Add E2E Tests 🧪 ✅ RELEASED

**Released:** 2025-11-25
**Priority:** MEDIUM
**Scope:** Single session (~128K tokens)

Add integration tests for full pipeline and CLI.

**Deliverables:**
- ✅ E2E test: `AnalyzeProject` full pipeline (21 tests)
- ✅ CLI smoke test (spawn process, check output) (22 tests)
- ✅ Test `examples/good-architecture/` → 0 violations
- ✅ Test `examples/bad/` → specific violations
- ✅ Test JSON output format (19 tests)
- ✅ 519 total tests (519 passing, **100% pass rate** 🎉)
- ✅ Comprehensive E2E coverage for API and CLI
- ✅ 3 new E2E test files with full pipeline coverage
- ✅ Publish to npm

---

### Version 0.7.9 - Refactor Large Detectors 🔧 (Optional)

**Priority:** LOW
**Scope:** Single session (~128K tokens)

Refactor largest detectors to reduce complexity.

**Targets:**
| Detector | Lines | Complexity |
|----------|-------|------------|
| RepositoryPatternDetector | 479 | 35 |
| HardcodeDetector | 459 | 41 |
| AggregateBoundaryDetector | 381 | 47 |

**Deliverables:**
- [ ] Extract regex patterns into strategies
- [ ] Reduce cyclomatic complexity < 25
- [ ] Publish to npm

---

### Version 0.8.0 - Secret Detection 🔐
**Target:** Q1 2025
**Priority:** CRITICAL

Detect hardcoded secrets (API keys, tokens, credentials) using industry-standard Secretlint library.

**🎯 SecretDetector - NEW standalone detector:**

```typescript
// ❌ CRITICAL: Hardcoded AWS credentials
const AWS_KEY = "AKIA1234567890ABCDEF"  // VIOLATION!
const AWS_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  // VIOLATION!

// ❌ CRITICAL: Hardcoded GitHub token
const GITHUB_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuv"  // VIOLATION!

// ❌ CRITICAL: SSH Private Key in code
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...`  // VIOLATION!

// ❌ CRITICAL: NPM token
//registry.npmjs.org/:_authToken=npm_abc123xyz  // VIOLATION!

// ✅ GOOD: Use environment variables
const AWS_KEY = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET = process.env.AWS_SECRET_ACCESS_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
```

**Planned Features:**
- ✅ **SecretDetector** - Standalone detector (separate from HardcodeDetector)
- ✅ **Secretlint Integration** - Industry-standard library (@secretlint/node)
- ✅ **350+ Secret Patterns** - AWS, GitHub, NPM, SSH, GCP, Slack, Basic Auth, etc.
- ✅ **CRITICAL Severity** - All secret violations marked as critical
- ✅ **Smart Suggestions** - Context-aware remediation per secret type
- ✅ **Clean Architecture** - New ISecretDetector interface, SecretViolation value object
- ✅ **CLI Integration** - New "🔐 Secrets" section in output
- ✅ **Parallel Execution** - Runs alongside existing detectors

**Secret Types Detected:**
- AWS Access Keys & Secret Keys
- GitHub Tokens (ghp_, github_pat_, gho_, etc.)
- NPM tokens in .npmrc and code
- SSH Private Keys
- GCP Service Account credentials
- Slack tokens (xoxb-, xoxp-, etc.)
- Basic Auth credentials
- JWT tokens
- Private encryption keys

**Architecture:**
```typescript
// New domain layer
interface ISecretDetector {
    detectAll(code: string, filePath: string): Promise<SecretViolation[]>
}

class SecretViolation {
    file: string
    line: number
    secretType: string  // AWS, GitHub, NPM, etc.
    message: string
    severity: "critical"
    suggestion: string  // Context-aware guidance
}

// New infrastructure implementation
class SecretDetector implements ISecretDetector {
    // Uses @secretlint/node internally
}
```

**Why Secretlint?**
- ✅ Actively maintained (updates weekly)
- ✅ TypeScript native
- ✅ Pluggable architecture
- ✅ Low false positives
- ✅ Industry standard

**Why NOT custom implementation?**
- ❌ No good npm library for magic numbers/strings
- ❌ Our HardcodeDetector is better than existing solutions
- ✅ Secretlint is perfect for secrets (don't reinvent the wheel)
- ✅ Two focused detectors better than one bloated detector

**Impact:**
Guardian will now catch critical security issues BEFORE they reach production, complementing existing magic number/string detection.

---

### Version 0.9.0 - Anemic Domain Model Detection 🩺
**Target:** Q2 2026
**Priority:** MEDIUM

Detect anemic domain models (entities without behavior):

```typescript
// ❌ BAD: Anemic model (only getters/setters)
class Order {
    getStatus() { return this.status }
    setStatus(status: string) { this.status = status }  // VIOLATION!

    getTotal() { return this.total }
    setTotal(total: number) { this.total = total }  // VIOLATION!
}

// ✅ GOOD: Rich domain model
class Order {
    public approve(): void {
        if (!this.canBeApproved()) {
            throw new CannotApproveOrderError()
        }
        this.status = OrderStatus.APPROVED
        this.events.push(new OrderApprovedEvent(this.id))
    }

    public calculateTotal(): Money {
        return this.items.reduce((sum, item) => sum.add(item.price), Money.zero())
    }
}
```

**Planned Features:**
- Count methods vs properties ratio
- Detect public setters (anti-pattern in DDD)
- Check for business logic in entities
- Warn about entities with only getters/setters
- Suggest moving logic from services to entities

---

### Version 0.10.0 - Domain Event Usage Validation 📢
**Target:** Q2 2026
**Priority:** MEDIUM

Validate proper use of Domain Events:

```typescript
// ❌ BAD: Direct coupling to infrastructure
class Order {
    approve(emailService: EmailService) {  // VIOLATION!
        this.status = OrderStatus.APPROVED
        emailService.sendOrderApproved(this.id)  // Direct dependency
    }
}

// ✅ GOOD: Domain Events
class Order {
    private events: DomainEvent[] = []

    approve() {
        this.status = OrderStatus.APPROVED
        this.events.push(new OrderApprovedEvent(this.id, this.userId))
    }

    getEvents(): DomainEvent[] {
        return this.events
    }
}
```

**Planned Features:**
- Detect direct infrastructure calls from entities
- Validate event publishing pattern
- Check events inherit from DomainEvent base
- Verify event handlers in infrastructure
- Suggest event-driven refactoring

---

### Version 0.11.0 - Value Object Immutability Check 🔐
**Target:** Q2 2026
**Priority:** MEDIUM

Ensure Value Objects are immutable:

```typescript
// ❌ BAD: Mutable Value Object
class Email {
    constructor(public value: string) {}  // VIOLATION! public mutable

    setValue(newValue: string) {  // VIOLATION! setter
        this.value = newValue
    }
}

// ✅ GOOD: Immutable Value Object
class Email {
    constructor(private readonly value: string) {
        if (!this.isValid(value)) {
            throw new InvalidEmailError()
        }
    }

    getValue(): string {
        return this.value
    }

    equals(other: Email): boolean {
        return this.value === other.value
    }
}
```

**Planned Features:**
- Check Value Objects have readonly fields
- Detect public setters in Value Objects
- Verify equals() method exists
- Check constructor validation
- Validate immutability pattern

---

### Version 0.12.0 - Use Case Single Responsibility 🎯
**Target:** Q2 2026
**Priority:** LOW

Enforce Single Responsibility Principle for Use Cases:

```typescript
// ❌ BAD: Use Case doing too much
class ManageUser {
    async createUser() { }
    async updateUser() { }
    async deleteUser() { }
    async sendEmail() { }  // VIOLATION! Mixed responsibilities
}

// ✅ GOOD: Single responsibility per Use Case
class CreateUser {
    async execute(request: CreateUserRequest): Promise<UserResponseDto> {
        // Only creates user
    }
}

class SendWelcomeEmail {
    async execute(userId: string): Promise<void> {
        // Only sends email
    }
}
```

**Planned Features:**
- Check Use Case has single public method (execute)
- Validate Use Case naming (Verb + Noun)
- Detect multiple responsibilities
- Suggest splitting large Use Cases

---

### Version 0.13.0 - Interface Segregation Validation 🔌
**Target:** Q2 2026
**Priority:** LOW

Validate Interface Segregation Principle:

```typescript
// ❌ BAD: Fat Interface
interface IUserRepository {
    // CRUD
    findById(id: string): Promise<User>
    save(user: User): Promise<void>

    // Analytics - VIOLATION! Mixed concerns
    getUserStatistics(): Promise<UserStats>
    getActiveUsersCount(): Promise<number>

    // Export - VIOLATION!
    exportToCSV(): Promise<string>
}

// ✅ GOOD: Segregated Interfaces
interface IUserRepository {
    findById(id: string): Promise<User>
    save(user: User): Promise<void>
}

interface IUserAnalytics {
    getUserStatistics(userId: string): Promise<UserStats>
    getActiveUsersCount(): Promise<number>
}

interface IUserExporter {
    exportToCSV(users: User[]): Promise<string>
}
```

**Planned Features:**
- Count methods per interface (> 10 = warning)
- Check method cohesion
- Detect mixed concerns in interfaces
- Suggest interface splitting

---

### Version 0.14.0 - Port-Adapter Pattern Validation 🔌
**Target:** Q2 2026
**Priority:** MEDIUM

Validate Hexagonal Architecture (Ports & Adapters):

```typescript
// ❌ BAD: Direct external dependency
import { TwilioClient } from 'twilio'

class SendNotification {
    constructor(private twilio: TwilioClient) {}  // VIOLATION!
}

// ✅ GOOD: Port in application
interface INotificationPort {
    sendSMS(phone: string, message: string): Promise<void>
}

class SendNotification {
    constructor(private notificationPort: INotificationPort) {}  // OK
}

// ✅ GOOD: Adapter in infrastructure
class TwilioAdapter implements INotificationPort {
    async sendSMS(phone: string, message: string): Promise<void> {
        await this.twilio.messages.create({ to: phone, body: message })
    }
}
```

**Planned Features:**
- Check Ports (interfaces) are in application/domain
- Verify Adapters are in infrastructure
- Detect external library imports in use cases
- Validate port-adapter pattern usage

---

### Version 0.15.0 - Configuration File Support ⚙️
**Target:** Q3 2026
**Priority:** MEDIUM

Add support for configuration file `.guardianrc`:

```javascript
// guardian.config.js or .guardianrc.js
export default {
    rules: {
        'hardcode/magic-numbers': 'error',
        'hardcode/magic-strings': 'warn',
        'architecture/layer-violation': 'error',
        'architecture/framework-leak': 'error',
        'architecture/entity-exposure': 'error',
        'circular-dependency': 'error',
        'naming-convention': 'warn',
    },

    exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        'scripts/',
        'migrations/',
    ],

    layers: {
        domain: 'src/domain',
        application: 'src/application',
        infrastructure: 'src/infrastructure',
        shared: 'src/shared',
    },

    // Ignore specific violations
    ignore: {
        'hardcode/magic-numbers': {
            'config/constants.ts': [3000, 8080],  // Allow specific values
        },
    },
}
```

**Planned Features:**
- Configuration file support (.guardianrc, .guardianrc.js, guardian.config.js)
- Rule-level severity configuration (error, warn, off)
- Custom layer path mappings
- Per-file ignore patterns
- Extends support (base configs)

---

### Version 0.16.0 - Command Query Separation (CQS/CQRS) 📝
**Target:** Q3 2026
**Priority:** MEDIUM

Enforce separation between commands and queries:

```typescript
// ❌ BAD: Method returns data AND changes state
class User {
    activate(): User {  // VIOLATION!
        this.status = 'active'
        return this  // Returns data + changes state
    }
}

// ❌ BAD: Use Case name implies both
class UpdateAndGetUser {  // VIOLATION!
    async execute(id: string, data: UpdateData): Promise<UserDto> {
        await this.userRepo.update(id, data)  // Command
        return await this.userRepo.findById(id)  // Query
    }
}

// ✅ GOOD: Commands and Queries separated
class User {
    activate(): void {  // Command: changes state, returns void
        this.status = 'active'
        this.events.push(new UserActivatedEvent(this.id))
    }

    isActive(): boolean {  // Query: returns data, no state change
        return this.status === 'active'
    }
}

// ✅ GOOD: Separate Use Cases
class ActivateUser {  // Command
    async execute(id: string): Promise<void> {
        const user = await this.userRepo.findById(id)
        user.activate()
        await this.userRepo.save(user)
    }
}

class GetUser {  // Query
    async execute(id: string): Promise<UserDto> {
        const user = await this.userRepo.findById(id)
        return UserMapper.toDto(user)
    }
}
```

**Planned Features:**
- Detect methods that both change state and return data
- Check Use Case names for CQS violations (UpdateAndGet, SaveAndReturn)
- Validate Command Use Cases return void
- Validate Query Use Cases don't modify state
- Suggest splitting into Command and Query

---

### Version 0.17.0 - Factory Pattern Validation 🏭
**Target:** Q3 2026
**Priority:** LOW

Validate proper use of Factory Pattern:

```typescript
// ❌ BAD: Complex logic in constructor
class Order {
    constructor(userId: string, items: any[]) {  // VIOLATION!
        this.id = uuid()
        this.userId = userId
        this.status = 'pending'
        this.createdAt = new Date()

        // Complex business logic in constructor
        this.items = items.map(item => {
            if (!item.price || item.price < 0) {
                throw new Error('Invalid item')
            }
            return new OrderItem(item)
        })

        this.total = this.calculateTotal()

        if (this.total > 10000) {
            this.requiresApproval = true
        }
    }
}

// ✅ GOOD: Factory with separate concerns
class OrderFactory {
    static create(userId: string, items: CreateOrderItem[]): Order {
        this.validateItems(items)

        const orderItems = items.map(item =>
            OrderItem.create(item.productId, item.quantity, item.price)
        )

        const order = new Order(
            OrderId.generate(),
            UserId.from(userId),
            orderItems,
            OrderStatus.PENDING
        )

        if (order.getTotal().greaterThan(Money.from(10000))) {
            order.markAsRequiringApproval()
        }

        return order
    }

    static reconstitute(data: OrderData): Order {
        return new Order(
            OrderId.from(data.id),
            UserId.from(data.userId),
            data.items,
            OrderStatus.from(data.status)
        )
    }
}

class Order {
    constructor(
        private readonly id: OrderId,
        private readonly userId: UserId,
        private items: OrderItem[],
        private status: OrderStatus
    ) {}  // Simple constructor
}
```

**Planned Features:**
- Detect complex logic in entity constructors
- Check for `new Entity()` calls in use cases
- Validate Factory classes exist for complex aggregates
- Verify Factory has `create()` and `reconstitute()` methods
- Suggest extracting complex construction to Factory

---

### Version 0.18.0 - Specification Pattern Detection 🔍
**Target:** Q3 2026
**Priority:** MEDIUM

Validate use of Specification Pattern for business rules:

```typescript
// ❌ BAD: Business rules scattered in use case
class ApproveOrder {
    async execute(orderId: string) {
        const order = await this.orderRepo.findById(orderId)

        // VIOLATION! Business rules in use case
        if (order.total < 100 || order.total > 10000) {
            throw new Error('Order total out of range')
        }

        if (order.items.length === 0) {
            throw new Error('Order has no items')
        }

        if (order.status !== 'pending') {
            throw new Error('Order is not pending')
        }

        order.approve()
        await this.orderRepo.save(order)
    }
}

// ✅ GOOD: Specification Pattern
class OrderCanBeApprovedSpec implements ISpecification<Order> {
    isSatisfiedBy(order: Order): boolean {
        return (
            new OrderHasItemsSpec().isSatisfiedBy(order) &&
            new OrderTotalInRangeSpec(100, 10000).isSatisfiedBy(order) &&
            new OrderIsPendingSpec().isSatisfiedBy(order)
        )
    }

    whyNotSatisfied(order: Order): string {
        if (!new OrderHasItemsSpec().isSatisfiedBy(order)) {
            return 'Order must have at least one item'
        }
        // ...
    }
}

class ApproveOrder {
    async execute(orderId: string) {
        const order = await this.orderRepo.findById(orderId)

        const spec = new OrderCanBeApprovedSpec()
        if (!spec.isSatisfiedBy(order)) {
            throw new Error(spec.whyNotSatisfied(order))
        }

        order.approve()
        await this.userRepo.save(order)
    }
}
```

**Planned Features:**
- Detect complex business rules in use cases
- Check for multiple inline conditions
- Validate Specification classes in domain
- Verify `isSatisfiedBy()` and `whyNotSatisfied()` methods
- Suggest extracting rules to Specifications

---

### Version 0.19.0 - Layered Service Anti-pattern Detection ⚠️
**Target:** Q3 2026
**Priority:** MEDIUM

Detect Service layers instead of rich domain models:

```typescript
// ❌ BAD: Anemic entity + Service layer
class Order {  // VIOLATION! Only data
    id: string
    total: number
    status: string
    items: OrderItem[]
}

class OrderService {  // VIOLATION! All logic in service
    approve(order: Order): void {
        if (order.status !== 'pending') {
            throw new Error('Cannot approve')
        }
        order.status = 'approved'
    }

    calculateTotal(order: Order): number {
        return order.items.reduce((sum, item) => sum + item.price, 0)
    }

    addItem(order: Order, item: OrderItem): void {
        order.items.push(item)
        order.total = this.calculateTotal(order)
    }
}

// ✅ GOOD: Rich domain model
class Order {
    private readonly id: OrderId
    private status: OrderStatus
    private items: OrderItem[]

    public approve(): void {
        if (!this.isPending()) {
            throw new CannotApproveOrderError()
        }
        this.status = OrderStatus.APPROVED
        this.events.push(new OrderApprovedEvent(this.id))
    }

    public getTotal(): Money {
        return this.items.reduce(
            (sum, item) => sum.add(item.getPrice()),
            Money.zero()
        )
    }

    public addItem(item: OrderItem): void {
        this.items.push(item)
    }
}

// Domain Service only for multi-entity operations
class OrderService {
    transferItemsBetweenOrders(from: Order, to: Order, itemIds: string[]): void {
        const items = from.removeItems(itemIds)
        to.addItems(items)
    }
}
```

**Planned Features:**
- Detect service methods operating on single entity
- Check entity-to-method ratio in services
- Validate entities have behavior methods
- Suggest moving service methods to entities
- Allow services only for multi-entity operations

---

### Version 0.20.0 - Bounded Context Leak Detection 🚧
**Target:** Q3 2026
**Priority:** LOW

Detect leaks between Bounded Contexts:

```typescript
// ❌ BAD: Direct dependency between contexts
// contexts/orders/domain/Order.ts
import { User } from '../../../users/domain/User'  // VIOLATION!
import { Product } from '../../../catalog/domain/Product'  // VIOLATION!

class Order {
    constructor(
        private user: User,  // VIOLATION!
        private products: Product[]  // VIOLATION!
    ) {}
}

// ✅ GOOD: Independent contexts
// contexts/orders/domain/Order.ts
import { UserId } from './value-objects/UserId'
import { ProductId } from './value-objects/ProductId'

class Order {
    constructor(
        private userId: UserId,  // OK: only ID
        private items: OrderItem[]
    ) {}
}

class OrderItem {
    constructor(
        private productId: ProductId,
        private productName: string,  // OK: denormalized data
        private price: Money
    ) {}
}

// ✅ GOOD: Integration via events
// contexts/catalog/domain/events/ProductPriceChangedEvent.ts
class ProductPriceChangedEvent {
    constructor(
        public readonly productId: string,
        public readonly newPrice: number
    ) {}
}

// contexts/orders/application/handlers/ProductPriceChangedHandler.ts
class ProductPriceChangedHandler {
    async handle(event: ProductPriceChangedEvent) {
        await this.orderItemRepo.updatePrice(event.productId, event.newPrice)
    }
}
```

**Planned Features:**
- Detect entity imports across contexts
- Check for context folder structure
- Validate only ID references between contexts
- Verify event-based integration
- Suggest Anti-Corruption Layer

---

### Version 0.21.0 - Transaction Script vs Domain Model Detection 📜
**Target:** Q3 2026
**Priority:** LOW

Detect Transaction Script anti-pattern:

```typescript
// ❌ BAD: Transaction Script (procedural)
class ProcessOrder {
    async execute(orderId: string) {  // VIOLATION! All logic in use case
        const order = await this.orderRepo.findById(orderId)

        let total = 0
        for (const item of order.items) {
            total += item.price * item.quantity
        }

        if (total > 100) {
            total = total * 0.9
        }

        order.total = total
        order.status = 'processed'

        await this.orderRepo.save(order)
        await this.emailService.send(order.userId, 'Order processed')
        await this.inventoryService.reserve(order.items)
    }
}

// ✅ GOOD: Domain Model (OOP)
class ProcessOrder {
    async execute(orderId: string) {
        const order = await this.orderRepo.findById(orderId)

        order.process()  // Business logic in domain

        await this.orderRepo.save(order)
        await this.eventDispatcher.dispatch(order.getEvents())
    }
}

class Order {
    process(): void {
        this.applyDiscountIfEligible()
        this.markAsProcessed()
        this.events.push(new OrderProcessedEvent(this.id, this.userId, this.items))
    }

    private applyDiscountIfEligible(): void {
        if (new OrderEligibleForDiscountSpec().isSatisfiedBy(this)) {
            const discount = new DiscountCalculator().calculate(this)
            this.applyDiscount(discount)
        }
    }
}
```

**Planned Features:**
- Detect procedural logic in use cases
- Check use case length (> 30-50 lines = warning)
- Validate business logic is in domain
- Detect loops and conditions in use cases
- Suggest moving logic to domain entities

---

### Version 0.22.0 - Persistence Ignorance Validation 💾
**Target:** Q3 2026
**Priority:** MEDIUM

Validate domain doesn't know about persistence:

```typescript
// ❌ BAD: Domain entity with ORM decorators
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity('users')  // VIOLATION!
class User {
    @PrimaryGeneratedColumn()  // VIOLATION!
    id: string

    @Column()  // VIOLATION!
    email: string

    @BeforeInsert()  // VIOLATION! ORM lifecycle
    setCreatedAt() {
        this.createdAt = new Date()
    }
}

// ✅ GOOD: Clean domain entity
class User {
    private readonly id: UserId
    private email: Email
    private readonly createdAt: Date

    constructor(id: UserId, email: Email) {
        this.id = id
        this.email = email
        this.createdAt = new Date()
    }

    changeEmail(newEmail: Email): void {
        if (!this.canChangeEmail()) {
            throw new Error('Cannot change email')
        }
        this.email = newEmail
        this.events.push(new EmailChangedEvent(this.id, newEmail))
    }
}

// ✅ GOOD: ORM mapping in infrastructure
// infrastructure/persistence/typeorm/entities/UserEntity.ts
@Entity('users')
class UserEntity {
    @PrimaryColumn()
    id: string

    @Column()
    email: string

    @Column({ type: 'timestamp' })
    createdAt: Date
}

// infrastructure/persistence/typeorm/mappers/UserMapper.ts
class UserEntityMapper {
    toDomain(entity: UserEntity): User {
        return new User(
            UserId.from(entity.id),
            Email.from(entity.email)
        )
    }

    toPersistence(user: User): UserEntity {
        const entity = new UserEntity()
        entity.id = user.getId().getValue()
        entity.email = user.getEmail().getValue()
        return entity
    }
}
```

**Planned Features:**
- Detect ORM decorators in domain entities
- Check for ORM library imports in domain
- Validate no persistence lifecycle methods
- Verify mapping layer in infrastructure
- Suggest persistence ignorance pattern

---

### Version 0.23.0 - Null Object Pattern Detection 🎭
**Target:** Q3 2026
**Priority:** LOW

Detect missing Null Object pattern:

```typescript
// ❌ BAD: Multiple null checks
class ProcessOrder {
    async execute(orderId: string) {
        const order = await this.orderRepo.findById(orderId)

        if (order === null) {  // VIOLATION!
            throw new Error('Order not found')
        }

        const discount = await this.discountService.findDiscount(order.userId)
        if (discount !== null) {  // VIOLATION!
            order.applyDiscount(discount)
        }

        const customer = await this.customerRepo.findById(order.userId)
        if (customer !== null && customer.isPremium()) {  // VIOLATION!
            order.applyPremiumBenefits()
        }
    }
}

// ✅ GOOD: Null Object Pattern
class Discount {
    constructor(
        private readonly percentage: number,
        private readonly code: string
    ) {}

    apply(amount: Money): Money {
        return amount.multiply(1 - this.percentage / 100)
    }
}

class NullDiscount extends Discount {
    constructor() {
        super(0, 'NONE')
    }

    apply(amount: Money): Money {
        return amount
    }

    isNull(): boolean {
        return true
    }
}

class ProcessOrder {
    async execute(orderId: string) {
        const order = await this.orderRepo.findById(orderId)

        if (order.isNull()) {  // Single check
            throw new OrderNotFoundError(orderId)
        }

        const discount = await this.discountService.findDiscount(order.userId)
        order.applyDiscount(discount)  // Works with NullDiscount

        const customer = await this.customerRepo.findById(order.userId)
        if (customer.isPremium()) {  // NullCustomer.isPremium() returns false
            order.applyPremiumBenefits()
        }
    }
}
```

**Planned Features:**
- Count null checks in use cases
- Suggest Null Object pattern for frequent checks
- Validate Null Object classes inherit from base
- Check for `isNull()` method
- Detect repositories returning null vs Null Object

---

### Version 0.24.0 - Primitive Obsession in Methods 🔢
**Target:** Q3 2026
**Priority:** MEDIUM

Detect primitives instead of Value Objects in signatures:

```typescript
// ❌ BAD: Too many primitives
class Order {
    constructor(
        id: string,  // VIOLATION!
        userId: string,  // VIOLATION!
        customerEmail: string,  // VIOLATION!
        total: number,  // VIOLATION!
        currency: string,  // VIOLATION!
        createdAt: Date
    ) {}

    applyDiscount(percentage: number): void {}  // VIOLATION!

    addItem(productId: string, quantity: number, price: number): void {}  // VIOLATION!

    setShippingAddress(
        street: string,
        city: string,
        zipCode: string,
        country: string
    ): void {}  // VIOLATION!
}

// ✅ GOOD: Value Objects
class Order {
    constructor(
        private readonly id: OrderId,
        private readonly userId: UserId,
        private readonly customer: Customer,
        private total: Money,
        private readonly createdAt: Date
    ) {}

    applyDiscount(discount: Discount): void {
        this.total = discount.apply(this.total)
    }

    addItem(item: OrderItem): void {
        this.items.push(item)
        this.recalculateTotal()
    }

    setShippingAddress(address: Address): void {
        if (!address.isValid()) {
            throw new InvalidAddressError()
        }
        this.shippingAddress = address
    }
}
```

**Planned Features:**
- Detect methods with > 3 primitive parameters
- Check for common Value Object candidates (email, phone, money, address)
- Validate parameter ordering issues
- Suggest creating Value Objects
- Detect missing validation for primitives

---

### Version 0.25.0 - Service Locator Anti-pattern 🔍
**Target:** Q4 2026
**Priority:** MEDIUM

Detect Service Locator instead of Dependency Injection:

```typescript
// ❌ BAD: Service Locator
class ServiceLocator {  // VIOLATION! Anti-pattern
    private static services: Map<string, any> = new Map()

    static register<T>(name: string, service: T): void {
        this.services.set(name, service)
    }

    static get<T>(name: string): T {
        return this.services.get(name) as T
    }
}

class CreateUser {
    async execute(data: CreateUserRequest) {
        // VIOLATION! Hidden dependencies
        const userRepo = ServiceLocator.get<IUserRepository>('userRepository')
        const emailService = ServiceLocator.get<IEmailService>('emailService')
        const logger = ServiceLocator.get<ILogger>('logger')

        const user = User.create(data.email, data.name)
        await userRepo.save(user)
        await emailService.sendWelcome(user.email)
        logger.info('User created')
    }
}

// ✅ GOOD: Dependency Injection
class CreateUser {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly emailService: IEmailService,
        private readonly logger: ILogger
    ) {}  // Explicit dependencies

    async execute(data: CreateUserRequest) {
        const user = User.create(data.email, data.name)
        await this.userRepo.save(user)
        await this.emailService.sendWelcome(user.email)
        this.logger.info('User created')
    }
}
```

**Planned Features:**
- Detect global ServiceLocator/Registry classes
- Check for `.get()` calls for dependencies
- Validate constructor injection
- Detect hidden dependencies
- Suggest DI container usage

---

### Version 0.26.0 - Double Dispatch Pattern Validation 🎯
**Target:** Q4 2026
**Priority:** LOW

Validate Double Dispatch for polymorphism:

```typescript
// ❌ BAD: Type checking instead of polymorphism
class CalculateShippingCost {
    execute(order: Order): Money {
        let cost = Money.zero()

        // VIOLATION! Type checking
        for (const item of order.items) {
            if (item.type === 'physical') {
                cost = cost.add(this.calculatePhysicalShipping(item))
            } else if (item.type === 'digital') {
                cost = cost.add(Money.zero())
            } else if (item.type === 'subscription') {
                cost = cost.add(this.calculateSubscriptionShipping(item))
            }
        }

        return cost
    }
}

// ✅ GOOD: Double Dispatch (Visitor Pattern)
abstract class OrderItem {
    abstract accept(visitor: IOrderItemVisitor): void
}

class PhysicalItem extends OrderItem {
    accept(visitor: IOrderItemVisitor): void {
        visitor.visitPhysicalItem(this)
    }
}

class DigitalItem extends OrderItem {
    accept(visitor: IOrderItemVisitor): void {
        visitor.visitDigitalItem(this)
    }
}

interface IOrderItemVisitor {
    visitPhysicalItem(item: PhysicalItem): void
    visitDigitalItem(item: DigitalItem): void
}

class ShippingCostCalculator implements IOrderItemVisitor {
    private cost: Money = Money.zero()

    calculate(items: OrderItem[]): Money {
        this.cost = Money.zero()
        items.forEach(item => item.accept(this))
        return this.cost
    }

    visitPhysicalItem(item: PhysicalItem): void {
        this.cost = this.cost.add(item.getWeight().multiply(Money.from(2)))
    }

    visitDigitalItem(item: DigitalItem): void {
        // Free shipping
    }
}
```

**Planned Features:**
- Detect frequent `instanceof` or type checking
- Check for long if-else/switch by type
- Suggest Visitor pattern for complex logic
- Validate polymorphism usage
- Detect missing abstraction opportunities

---

### Version 0.27.0 - Entity Identity Validation 🆔
**Target:** Q4 2026
**Priority:** MEDIUM

Validate proper entity identity handling:

```typescript
// ❌ BAD: Mutable identity
class User {
    constructor(
        public id: string,  // VIOLATION! public mutable
        private email: string
    ) {}

    equals(other: User): boolean {
        return this === other  // VIOLATION! Reference comparison
    }
}

class UpdateUser {
    async execute(userId: string, email: string) {
        const user = await this.userRepo.findById(userId)

        user.id = uuid()  // VIOLATION! Changing identity
        user.email = email

        await this.userRepo.save(user)
    }
}

// ✅ GOOD: Immutable identity
class User {
    constructor(
        private readonly id: UserId,  // OK: readonly
        private email: Email
    ) {}

    getId(): UserId {
        return this.id
    }

    equals(other: User): boolean {  // OK: ID comparison
        if (!other) return false
        if (this === other) return true
        return this.id.equals(other.id)
    }

    changeEmail(newEmail: Email): void {
        if (this.email.equals(newEmail)) return

        this.email = newEmail
        this.events.push(new EmailChangedEvent(this.id, newEmail))
    }
}

class UserId {
    private readonly value: string

    private constructor(value: string) {
        if (!this.isValid(value)) {
            throw new Error('Invalid user ID')
        }
        this.value = value
    }

    static generate(): UserId {
        return new UserId(uuid())
    }

    static from(value: string): UserId {
        return new UserId(value)
    }

    getValue(): string {
        return this.value
    }

    equals(other: UserId): boolean {
        if (!other) return false
        return this.value === other.getValue()
    }
}
```

**Planned Features:**
- Detect public mutable ID fields
- Validate ID is Value Object
- Check for `equals()` method implementation
- Detect ID changes after construction
- Validate ID-based equality

---

### Version 0.28.0 - Saga Pattern Detection 🔄
**Target:** Q4 2026
**Priority:** LOW

Detect missing Saga for distributed transactions:

```typescript
// ❌ BAD: No compensating transactions
class PlaceOrder {
    async execute(orderData: PlaceOrderRequest) {
        // VIOLATION! No compensation
        const order = await this.orderRepo.create(orderData)

        try {
            await this.paymentService.charge(orderData.paymentInfo)
        } catch (error) {
            await this.orderRepo.delete(order.id)
            throw error
        }

        try {
            await this.inventoryService.reserve(order.items)
        } catch (error) {
            // VIOLATION! Payment charged but inventory failed
            await this.orderRepo.delete(order.id)
            // How to refund payment?
            throw error
        }
    }
}

// ✅ GOOD: Saga Pattern
class PlaceOrderSaga {
    private steps: SagaStep[] = []

    constructor(
        private readonly orderRepo: IOrderRepository,
        private readonly paymentService: IPaymentService,
        private readonly inventoryService: IInventoryService
    ) {
        this.initializeSteps()
    }

    private initializeSteps(): void {
        this.steps = [
            new CreateOrderStep(this.orderRepo),
            new ChargePaymentStep(this.paymentService),
            new ReserveInventoryStep(this.inventoryService)
        ]
    }

    async execute(orderData: PlaceOrderRequest): Promise<Order> {
        const context = new SagaContext(orderData)
        const executedSteps: SagaStep[] = []

        try {
            for (const step of this.steps) {
                await step.execute(context)
                executedSteps.push(step)
            }

            return context.getOrder()
        } catch (error) {
            await this.compensate(executedSteps, context)
            throw error
        }
    }

    private async compensate(
        executedSteps: SagaStep[],
        context: SagaContext
    ): Promise<void> {
        for (const step of executedSteps.reverse()) {
            try {
                await step.compensate(context)
            } catch (error) {
                this.logger.error(`Compensation failed for ${step.name}`, error)
            }
        }
    }
}

abstract class SagaStep {
    abstract readonly name: string
    abstract execute(context: SagaContext): Promise<void>
    abstract compensate(context: SagaContext): Promise<void>
}
```

**Planned Features:**
- Detect multiple external calls without compensation
- Check for Saga implementation
- Validate compensating transactions
- Detect incomplete rollback logic
- Suggest Saga pattern for distributed operations

---

### Version 0.29.0 - Anti-Corruption Layer Detection 🛡️
**Target:** Q4 2026
**Priority:** MEDIUM

Validate ACL for legacy system integration:

```typescript
// ❌ BAD: Direct legacy integration
class SyncOrderToLegacy {
    constructor(
        private legacyApi: LegacySystemAPI  // VIOLATION!
    ) {}

    async execute(order: Order) {
        // VIOLATION! Domain adapts to legacy
        const legacyOrder = {
            ord_id: order.id,
            cust_num: order.customerId,
            ord_amt: order.total * 100,  // Kopecks
            ord_sts: this.mapStatus(order.status),
            itms: order.items.map(i => ({
                prd_cd: i.productId,
                qty: i.quantity,
                prc: i.price * 100
            }))
        }

        await this.legacyApi.createOrder(legacyOrder)
    }
}

// ✅ GOOD: Anti-Corruption Layer
class LegacyOrderAdapter implements IOrderSyncPort {
    constructor(
        private readonly legacyApi: LegacySystemAPI,
        private readonly translator: LegacyOrderTranslator
    ) {}

    async syncOrder(order: Order): Promise<void> {
        const legacyModel = this.translator.toLegacy(order)
        await this.legacyApi.createOrder(legacyModel)
    }

    async fetchOrder(orderId: string): Promise<Order> {
        const legacyOrder = await this.legacyApi.getOrder(orderId)
        return this.translator.toDomain(legacyOrder)
    }
}

class LegacyOrderTranslator {
    toLegacy(order: Order): LegacyOrderModel {
        return {
            ord_id: order.getId().getValue(),
            cust_num: order.getCustomerId().getValue(),
            ord_amt: this.convertToLegacyAmount(order.getTotal()),
            ord_sts: this.mapDomainStatusToLegacy(order.getStatus()),
            itms: this.translateItems(order.getItems())
        }
    }

    toDomain(legacyOrder: LegacyOrderModel): Order {
        return Order.reconstitute(
            OrderId.from(legacyOrder.ord_id),
            CustomerId.from(legacyOrder.cust_num),
            this.convertFromLegacyAmount(legacyOrder.ord_amt),
            this.mapLegacyStatusToDomain(legacyOrder.ord_sts),
            this.translateItemsToDomain(legacyOrder.itms)
        )
    }
}

interface IOrderSyncPort {
    syncOrder(order: Order): Promise<void>
    fetchOrder(orderId: string): Promise<Order>
}
```

**Planned Features:**
- Detect direct legacy library imports
- Check for domain adaptation to external APIs
- Validate translator/adapter layer exists
- Detect legacy types in domain code
- Suggest Anti-Corruption Layer pattern

---

### Version 0.30.0 - Ubiquitous Language Validation 📖
**Target:** Q4 2026
**Priority:** HIGH

Validate consistent domain language usage:

```typescript
// ❌ BAD: Inconsistent terminology
class User {  // customer, user, client, or account?
    private customerId: string
}

class Order {
    private clientId: string  // Different term!
    private purchaseDate: Date  // purchase or order?
}

class RegisterClient {  // Register, Create, or SignUp?
    async execute(data: SignUpRequest) {  // Inconsistent!
        const account = new User(data)  // Another term!
        await this.userRepo.save(account)
    }
}

class CustomerController {  // Yet another term!
    async register(req: Request) {
        await this.registerClient.execute(req.body)
    }
}

// ✅ GOOD: Ubiquitous Language
class Customer {  // Agreed term: Customer
    private readonly customerId: CustomerId
    private readonly registrationDate: Date
}

class Order {
    private readonly customerId: CustomerId  // Consistent: Customer
    private readonly orderedAt: Date  // Consistent: ordered
}

class RegisterCustomer {  // Consistent: Register + Customer
    async execute(request: RegisterCustomerRequest) {
        const customer = Customer.register(
            Email.from(request.email),
            CustomerName.from(request.name)
        )

        await this.customerRepo.save(customer)

        return RegisterCustomerResponse.from(customer)
    }
}

class CustomerController {  // Consistent: Customer
    async register(req: Request) {
        const response = await this.registerCustomer.execute(req.body)
        return res.json(response)
    }
}

/**
 * Ubiquitous Language Dictionary:
 *
 * - Customer: Person who can place orders (NOT user, client, account)
 * - Register: Create new customer account (NOT signup, create)
 * - Order: Purchase request (NOT purchase, cart)
 * - OrderedAt: When order was placed (NOT purchaseDate, createdAt)
 * - OrderItem: Individual item in order (NOT lineItem, product)
 */
```

**Planned Features:**
- Detect synonyms for same concepts (User/Customer/Client)
- Check inconsistent verbs (Create/Register/SignUp)
- Validate business terms vs technical terms
- Require Ubiquitous Language glossary
- Check naming consistency across layers
- Suggest standardized terminology

---

### Version 1.0.0 - Stable Release 🚀
**Target:** Q4 2026
**Priority:** HIGH

Production-ready stable release:

**Features:**
- All detectors stabilized and tested
- Comprehensive documentation
- Performance optimizations
- Enterprise-grade reliability
- Breaking change stability commitment

**Ecosystem:**
- VS Code extension
- GitHub Action
- GitLab CI template
- Integration guides for major CI/CD platforms
- Metrics dashboard

---

## Future Ideas 💡

### AI Assistant Specific Features
- Detect over-engineering patterns (too many abstraction layers)
- Detect unimplemented code (TODO comments, placeholder methods)
- Naming consistency analysis (mixed conventions)
- Boundary validation detection

### Security Features
- Secrets detection (API keys, passwords, tokens)
- SQL injection pattern detection
- XSS vulnerability patterns
- Dependency vulnerability scanning

### Code Quality Metrics
- Code quality score (0-100)
- Maintainability index
- Technical debt estimation
- Trend analysis over time
- Compare metrics across commits

### Code Duplication
- Copy-paste detection
- Similar code block detection
- Suggest extracting common logic
- Duplicate constant detection

### IDE Extensions
- **VS Code Extension:**
  - Real-time detection as you type
  - Inline suggestions
  - Quick fixes
  - Code actions
  - Problem panel integration

- **JetBrains Plugin:**
  - IntelliJ IDEA, WebStorm support
  - Inspection integration
  - Quick fixes

### Platform Integrations
- **GitHub:**
  - GitHub Action
  - PR comments
  - Code scanning integration
  - Status checks
  - Trends dashboard

- **GitLab:**
  - GitLab CI template
  - Merge request comments
  - Security scanning integration

- **Bitbucket:**
  - Pipelines integration
  - PR decorators

---

## How to Contribute

Have an idea? Want to implement a feature?

1. Check existing [GitHub Issues](https://github.com/samiyev/puaros/issues)
2. Create a new issue with label `enhancement`
3. Discuss the approach with maintainers
4. Submit a Pull Request

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## Versioning

Guardian follows [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0) - Breaking changes
- **MINOR** (0.1.0) - New features, backwards compatible
- **PATCH** (0.0.1) - Bug fixes, backwards compatible

Until we reach 1.0.0, minor version bumps (0.x.0) may include breaking changes as we iterate on the API.

---

**Last Updated:** 2025-11-25
**Current Version:** 0.7.7
