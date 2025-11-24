import { ValueObject } from "./ValueObject"
import { REPOSITORY_VIOLATION_TYPES } from "../../shared/constants/rules"
import { REPOSITORY_PATTERN_MESSAGES } from "../constants/Messages"

interface RepositoryViolationProps {
    readonly violationType:
        | typeof REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE
        | typeof REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE
        | typeof REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE
        | typeof REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME
    readonly filePath: string
    readonly layer: string
    readonly line?: number
    readonly details: string
    readonly ormType?: string
    readonly repositoryName?: string
    readonly methodName?: string
}

/**
 * Represents a Repository Pattern violation in the codebase
 *
 * Repository Pattern violations occur when:
 * 1. Repository interfaces contain ORM-specific types
 * 2. Use cases depend on concrete repository implementations instead of interfaces
 * 3. Repositories are instantiated with 'new' in use cases
 * 4. Repository methods use technical names instead of domain language
 *
 * @example
 * ```typescript
 * // Violation: ORM type in interface
 * const violation = RepositoryViolation.create(
 *     'orm-type-in-interface',
 *     'src/domain/repositories/IUserRepository.ts',
 *     'domain',
 *     15,
 *     'Repository interface uses Prisma-specific type',
 *     'Prisma.UserWhereInput'
 * )
 * ```
 */
export class RepositoryViolation extends ValueObject<RepositoryViolationProps> {
    private constructor(props: RepositoryViolationProps) {
        super(props)
    }

    public static create(
        violationType:
            | typeof REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE
            | typeof REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE
            | typeof REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE
            | typeof REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME,
        filePath: string,
        layer: string,
        line: number | undefined,
        details: string,
        ormType?: string,
        repositoryName?: string,
        methodName?: string,
    ): RepositoryViolation {
        return new RepositoryViolation({
            violationType,
            filePath,
            layer,
            line,
            details,
            ormType,
            repositoryName,
            methodName,
        })
    }

    public get violationType(): string {
        return this.props.violationType
    }

    public get filePath(): string {
        return this.props.filePath
    }

    public get layer(): string {
        return this.props.layer
    }

    public get line(): number | undefined {
        return this.props.line
    }

    public get details(): string {
        return this.props.details
    }

    public get ormType(): string | undefined {
        return this.props.ormType
    }

    public get repositoryName(): string | undefined {
        return this.props.repositoryName
    }

    public get methodName(): string | undefined {
        return this.props.methodName
    }

    public getMessage(): string {
        switch (this.props.violationType) {
            case REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE:
                return `Repository interface uses ORM-specific type '${this.props.ormType || "unknown"}'. Domain should not depend on infrastructure concerns.`

            case REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE:
                return `Use case depends on concrete repository '${this.props.repositoryName || "unknown"}' instead of interface. Use dependency inversion.`

            case REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE:
                return `Use case creates repository with 'new ${this.props.repositoryName || "Repository"}()'. Use dependency injection instead.`

            case REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME:
                return `Repository method '${this.props.methodName || "unknown"}' uses technical name. Use domain language instead.`

            default:
                return `Repository pattern violation: ${this.props.details}`
        }
    }

    public getSuggestion(): string {
        switch (this.props.violationType) {
            case REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE:
                return this.getOrmTypeSuggestion()

            case REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE:
                return this.getConcreteRepositorySuggestion()

            case REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE:
                return this.getNewRepositorySuggestion()

            case REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME:
                return this.getNonDomainMethodSuggestion()

            default:
                return REPOSITORY_PATTERN_MESSAGES.DEFAULT_SUGGESTION
        }
    }

    private getOrmTypeSuggestion(): string {
        return [
            REPOSITORY_PATTERN_MESSAGES.STEP_REMOVE_ORM_TYPES,
            REPOSITORY_PATTERN_MESSAGES.STEP_USE_DOMAIN_TYPES,
            REPOSITORY_PATTERN_MESSAGES.STEP_KEEP_CLEAN,
            "",
            REPOSITORY_PATTERN_MESSAGES.EXAMPLE_PREFIX,
            REPOSITORY_PATTERN_MESSAGES.BAD_ORM_EXAMPLE,
            REPOSITORY_PATTERN_MESSAGES.GOOD_DOMAIN_EXAMPLE,
        ].join("\n")
    }

    private getConcreteRepositorySuggestion(): string {
        return [
            REPOSITORY_PATTERN_MESSAGES.STEP_DEPEND_ON_INTERFACE,
            REPOSITORY_PATTERN_MESSAGES.STEP_MOVE_TO_INFRASTRUCTURE,
            REPOSITORY_PATTERN_MESSAGES.STEP_USE_DI,
            "",
            REPOSITORY_PATTERN_MESSAGES.EXAMPLE_PREFIX,
            `❌ Bad: constructor(private repo: ${this.props.repositoryName || "UserRepository"})`,
            `✅ Good: constructor(private repo: I${this.props.repositoryName?.replace(/^.*?([A-Z]\w+)$/, "$1") || "UserRepository"})`,
        ].join("\n")
    }

    private getNewRepositorySuggestion(): string {
        return [
            REPOSITORY_PATTERN_MESSAGES.STEP_REMOVE_NEW,
            REPOSITORY_PATTERN_MESSAGES.STEP_INJECT_CONSTRUCTOR,
            REPOSITORY_PATTERN_MESSAGES.STEP_CONFIGURE_DI,
            "",
            REPOSITORY_PATTERN_MESSAGES.EXAMPLE_PREFIX,
            REPOSITORY_PATTERN_MESSAGES.BAD_NEW_REPO,
            REPOSITORY_PATTERN_MESSAGES.GOOD_INJECT_REPO,
        ].join("\n")
    }

    private getNonDomainMethodSuggestion(): string {
        const detailsMatch = /Consider: (.+)$/.exec(this.props.details)
        const smartSuggestion = detailsMatch ? detailsMatch[1] : null

        const technicalToDomain = {
            findOne: REPOSITORY_PATTERN_MESSAGES.SUGGESTION_FINDONE,
            findMany: REPOSITORY_PATTERN_MESSAGES.SUGGESTION_FINDMANY,
            insert: REPOSITORY_PATTERN_MESSAGES.SUGGESTION_INSERT,
            update: REPOSITORY_PATTERN_MESSAGES.SUGGESTION_UPDATE,
            delete: REPOSITORY_PATTERN_MESSAGES.SUGGESTION_DELETE,
            query: REPOSITORY_PATTERN_MESSAGES.SUGGESTION_QUERY,
        }

        const fallbackSuggestion =
            technicalToDomain[this.props.methodName as keyof typeof technicalToDomain]
        const finalSuggestion =
            smartSuggestion || fallbackSuggestion || "findById() or findByEmail()"

        return [
            REPOSITORY_PATTERN_MESSAGES.STEP_RENAME_METHOD,
            REPOSITORY_PATTERN_MESSAGES.STEP_REFLECT_BUSINESS,
            REPOSITORY_PATTERN_MESSAGES.STEP_AVOID_TECHNICAL,
            "",
            REPOSITORY_PATTERN_MESSAGES.EXAMPLE_PREFIX,
            `❌ Bad: ${this.props.methodName || "findOne"}()`,
            `✅ Good: ${finalSuggestion}`,
        ].join("\n")
    }

    public getExampleFix(): string {
        switch (this.props.violationType) {
            case REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE:
                return this.getOrmTypeExample()

            case REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE:
                return this.getConcreteRepositoryExample()

            case REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE:
                return this.getNewRepositoryExample()

            case REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME:
                return this.getNonDomainMethodExample()

            default:
                return REPOSITORY_PATTERN_MESSAGES.NO_EXAMPLE
        }
    }

    private getOrmTypeExample(): string {
        return `
// ❌ BAD: ORM-specific interface
// domain/repositories/IUserRepository.ts
interface IUserRepository {
    findOne(query: { where: { id: string } })  // Prisma-specific
    create(data: UserCreateInput)  // ORM types in domain
}

// ✅ GOOD: Clean domain interface
interface IUserRepository {
    findById(id: UserId): Promise<User | null>
    save(user: User): Promise<void>
    delete(id: UserId): Promise<void>
}`
    }

    private getConcreteRepositoryExample(): string {
        return `
// ❌ BAD: Use Case with concrete implementation
class CreateUser {
    constructor(private prisma: PrismaClient) {}  // VIOLATION!
}

// ✅ GOOD: Use Case with interface
class CreateUser {
    constructor(private userRepo: IUserRepository) {}  // OK
}`
    }

    private getNewRepositoryExample(): string {
        return `
// ❌ BAD: Creating repository in use case
class CreateUser {
    async execute(data: CreateUserRequest) {
        const repo = new UserRepository()  // VIOLATION!
        await repo.save(user)
    }
}

// ✅ GOOD: Inject repository via constructor
class CreateUser {
    constructor(private readonly userRepo: IUserRepository) {}

    async execute(data: CreateUserRequest) {
        await this.userRepo.save(user)  // OK
    }
}`
    }

    private getNonDomainMethodExample(): string {
        return `
// ❌ BAD: Technical method names
interface IUserRepository {
    findOne(id: string)  // Database terminology
    insert(user: User)   // SQL terminology
    query(filter: any)   // Technical term
}

// ✅ GOOD: Domain language
interface IUserRepository {
    findById(id: UserId): Promise<User | null>
    save(user: User): Promise<void>
    findByEmail(email: Email): Promise<User | null>
}`
    }
}
