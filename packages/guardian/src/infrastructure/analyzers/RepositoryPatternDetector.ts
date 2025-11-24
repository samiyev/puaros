import { IRepositoryPatternDetector } from "../../domain/services/RepositoryPatternDetectorService"
import { RepositoryViolation } from "../../domain/value-objects/RepositoryViolation"
import { LAYERS, REPOSITORY_VIOLATION_TYPES } from "../../shared/constants/rules"
import { ORM_QUERY_METHODS } from "../constants/orm-methods"
import { REPOSITORY_PATTERN_MESSAGES } from "../../domain/constants/Messages"

/**
 * Detects Repository Pattern violations in the codebase
 *
 * This detector identifies violations where the Repository Pattern is not properly implemented:
 * 1. ORM-specific types in repository interfaces (domain should be ORM-agnostic)
 * 2. Concrete repository usage in use cases (violates dependency inversion)
 * 3. Repository instantiation with 'new' in use cases (should use DI)
 * 4. Non-domain method names in repositories (should use ubiquitous language)
 *
 * @example
 * ```typescript
 * const detector = new RepositoryPatternDetector()
 *
 * // Detect violations in a repository interface
 * const code = `
 * interface IUserRepository {
 *     findOne(query: Prisma.UserWhereInput): Promise<User>
 * }
 * `
 * const violations = detector.detectViolations(
 *     code,
 *     'src/domain/repositories/IUserRepository.ts',
 *     'domain'
 * )
 *
 * // violations will contain ORM type violation
 * console.log(violations.length) // 1
 * console.log(violations[0].violationType) // 'orm-type-in-interface'
 * ```
 */
export class RepositoryPatternDetector implements IRepositoryPatternDetector {
    private readonly ormTypePatterns = [
        /Prisma\./,
        /PrismaClient/,
        /TypeORM/,
        /@Entity/,
        /@Column/,
        /@PrimaryColumn/,
        /@PrimaryGeneratedColumn/,
        /@ManyToOne/,
        /@OneToMany/,
        /@ManyToMany/,
        /@JoinColumn/,
        /@JoinTable/,
        /Mongoose\./,
        /Schema/,
        /Model</,
        /Document/,
        /Sequelize\./,
        /DataTypes\./,
        /FindOptions/,
        /WhereOptions/,
        /IncludeOptions/,
        /QueryInterface/,
        /MikroORM/,
        /EntityManager/,
        /EntityRepository/,
        /Collection</,
    ]

    private readonly technicalMethodNames = ORM_QUERY_METHODS

    private readonly domainMethodPatterns = [
        /^findBy[A-Z]/,
        /^findAll/,
        /^save$/,
        /^create$/,
        /^update$/,
        /^delete$/,
        /^remove$/,
        /^add$/,
        /^get[A-Z]/,
        /^search/,
        /^list/,
        /^has[A-Z]/,
        /^is[A-Z]/,
        /^exists[A-Z]/,
        /^existsBy[A-Z]/,
        /^clear[A-Z]/,
        /^clearAll$/,
        /^store[A-Z]/,
        /^initialize$/,
        /^close$/,
        /^connect$/,
        /^disconnect$/,
    ]

    private readonly concreteRepositoryPatterns = [
        /PrismaUserRepository/,
        /MongoUserRepository/,
        /TypeOrmUserRepository/,
        /SequelizeUserRepository/,
        /InMemoryUserRepository/,
        /PostgresUserRepository/,
        /MySqlUserRepository/,
        /Repository(?!Interface)/,
    ]

    /**
     * Detects all Repository Pattern violations in the given code
     */
    public detectViolations(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): RepositoryViolation[] {
        const violations: RepositoryViolation[] = []

        if (this.isRepositoryInterface(filePath, layer)) {
            violations.push(...this.detectOrmTypesInInterface(code, filePath, layer))
            violations.push(...this.detectNonDomainMethodNames(code, filePath, layer))
        }

        if (this.isUseCase(filePath, layer)) {
            violations.push(...this.detectConcreteRepositoryUsage(code, filePath, layer))
            violations.push(...this.detectNewRepositoryInstantiation(code, filePath, layer))
        }

        return violations
    }

    /**
     * Checks if a type is an ORM-specific type
     */
    public isOrmType(typeName: string): boolean {
        return this.ormTypePatterns.some((pattern) => pattern.test(typeName))
    }

    /**
     * Checks if a method name follows domain language conventions
     */
    public isDomainMethodName(methodName: string): boolean {
        if ((this.technicalMethodNames as readonly string[]).includes(methodName)) {
            return false
        }

        return this.domainMethodPatterns.some((pattern) => pattern.test(methodName))
    }

    /**
     * Checks if a file is a repository interface
     */
    public isRepositoryInterface(filePath: string, layer: string | undefined): boolean {
        if (layer !== LAYERS.DOMAIN) {
            return false
        }

        return /I[A-Z]\w*Repository\.ts$/.test(filePath) && /repositories?\//.test(filePath)
    }

    /**
     * Checks if a file is a use case
     */
    public isUseCase(filePath: string, layer: string | undefined): boolean {
        if (layer !== LAYERS.APPLICATION) {
            return false
        }

        return /use-cases?\//.test(filePath) && /[A-Z][a-z]+[A-Z]\w*\.ts$/.test(filePath)
    }

    /**
     * Detects ORM-specific types in repository interfaces
     */
    private detectOrmTypesInInterface(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): RepositoryViolation[] {
        const violations: RepositoryViolation[] = []
        const lines = code.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNumber = i + 1

            const methodMatch =
                /(\w+)\s*\([^)]*:\s*([^)]+)\)\s*:\s*.*?(?:Promise<([^>]+)>|([A-Z]\w+))/.exec(line)

            if (methodMatch) {
                const params = methodMatch[2]
                const returnType = methodMatch[3] || methodMatch[4]

                if (this.isOrmType(params)) {
                    const ormType = this.extractOrmType(params)
                    violations.push(
                        RepositoryViolation.create(
                            REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE,
                            filePath,
                            layer || LAYERS.DOMAIN,
                            lineNumber,
                            `Method parameter uses ORM type: ${ormType}`,
                            ormType,
                        ),
                    )
                }

                if (returnType && this.isOrmType(returnType)) {
                    const ormType = this.extractOrmType(returnType)
                    violations.push(
                        RepositoryViolation.create(
                            REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE,
                            filePath,
                            layer || LAYERS.DOMAIN,
                            lineNumber,
                            `Method return type uses ORM type: ${ormType}`,
                            ormType,
                        ),
                    )
                }
            }

            for (const pattern of this.ormTypePatterns) {
                if (pattern.test(line) && !line.trim().startsWith("//")) {
                    const ormType = this.extractOrmType(line)
                    violations.push(
                        RepositoryViolation.create(
                            REPOSITORY_VIOLATION_TYPES.ORM_TYPE_IN_INTERFACE,
                            filePath,
                            layer || LAYERS.DOMAIN,
                            lineNumber,
                            `Repository interface contains ORM-specific type: ${ormType}`,
                            ormType,
                        ),
                    )
                    break
                }
            }
        }

        return violations
    }

    /**
     * Detects non-domain method names in repository interfaces
     */
    private detectNonDomainMethodNames(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): RepositoryViolation[] {
        const violations: RepositoryViolation[] = []
        const lines = code.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNumber = i + 1

            const methodMatch = /^\s*(\w+)\s*\(/.exec(line)

            if (methodMatch) {
                const methodName = methodMatch[1]

                if (!this.isDomainMethodName(methodName) && !line.trim().startsWith("//")) {
                    violations.push(
                        RepositoryViolation.create(
                            REPOSITORY_VIOLATION_TYPES.NON_DOMAIN_METHOD_NAME,
                            filePath,
                            layer || LAYERS.DOMAIN,
                            lineNumber,
                            `Method '${methodName}' uses technical name instead of domain language`,
                            undefined,
                            undefined,
                            methodName,
                        ),
                    )
                }
            }
        }

        return violations
    }

    /**
     * Detects concrete repository usage in use cases
     */
    private detectConcreteRepositoryUsage(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): RepositoryViolation[] {
        const violations: RepositoryViolation[] = []
        const lines = code.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNumber = i + 1

            const constructorParamMatch =
                /constructor\s*\([^)]*(?:private|public|protected)\s+(?:readonly\s+)?(\w+)\s*:\s*([A-Z]\w*Repository)/.exec(
                    line,
                )

            if (constructorParamMatch) {
                const repositoryType = constructorParamMatch[2]

                if (!repositoryType.startsWith("I")) {
                    violations.push(
                        RepositoryViolation.create(
                            REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE,
                            filePath,
                            layer || LAYERS.APPLICATION,
                            lineNumber,
                            `Use case depends on concrete repository '${repositoryType}'`,
                            undefined,
                            repositoryType,
                        ),
                    )
                }
            }

            const fieldMatch =
                /(?:private|public|protected)\s+(?:readonly\s+)?(\w+)\s*:\s*([A-Z]\w*Repository)/.exec(
                    line,
                )

            if (fieldMatch) {
                const repositoryType = fieldMatch[2]

                if (
                    !repositoryType.startsWith("I") &&
                    !line.includes(REPOSITORY_PATTERN_MESSAGES.CONSTRUCTOR)
                ) {
                    violations.push(
                        RepositoryViolation.create(
                            REPOSITORY_VIOLATION_TYPES.CONCRETE_REPOSITORY_IN_USE_CASE,
                            filePath,
                            layer || LAYERS.APPLICATION,
                            lineNumber,
                            `Use case field uses concrete repository '${repositoryType}'`,
                            undefined,
                            repositoryType,
                        ),
                    )
                }
            }
        }

        return violations
    }

    /**
     * Detects 'new Repository()' instantiation in use cases
     */
    private detectNewRepositoryInstantiation(
        code: string,
        filePath: string,
        layer: string | undefined,
    ): RepositoryViolation[] {
        const violations: RepositoryViolation[] = []
        const lines = code.split("\n")

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNumber = i + 1

            const newRepositoryMatch = /new\s+([A-Z]\w*Repository)\s*\(/.exec(line)

            if (newRepositoryMatch && !line.trim().startsWith("//")) {
                const repositoryName = newRepositoryMatch[1]
                violations.push(
                    RepositoryViolation.create(
                        REPOSITORY_VIOLATION_TYPES.NEW_REPOSITORY_IN_USE_CASE,
                        filePath,
                        layer || LAYERS.APPLICATION,
                        lineNumber,
                        `Use case creates repository with 'new ${repositoryName}()'`,
                        undefined,
                        repositoryName,
                    ),
                )
            }
        }

        return violations
    }

    /**
     * Extracts ORM type name from a code line
     */
    private extractOrmType(line: string): string {
        for (const pattern of this.ormTypePatterns) {
            const match = line.match(pattern)
            if (match) {
                const startIdx = match.index || 0
                const typeMatch = /[\w.]+/.exec(line.slice(startIdx))
                return typeMatch ? typeMatch[0] : REPOSITORY_PATTERN_MESSAGES.UNKNOWN_TYPE
            }
        }
        return REPOSITORY_PATTERN_MESSAGES.UNKNOWN_TYPE
    }
}
