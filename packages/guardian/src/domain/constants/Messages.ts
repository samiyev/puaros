export const DEPENDENCY_VIOLATION_MESSAGES = {
    DOMAIN_INDEPENDENCE: "Domain layer should be independent and not depend on other layers",
    DOMAIN_MOVE_TO_DOMAIN:
        "Move the imported code to the domain layer if it contains business logic",
    DOMAIN_USE_DI:
        "Use dependency inversion: define an interface in domain and implement it in infrastructure",
    APPLICATION_NO_INFRA: "Application layer should not depend on infrastructure",
    APPLICATION_DEFINE_PORT: "Define an interface (Port) in application layer",
    APPLICATION_IMPLEMENT_ADAPTER: "Implement the interface (Adapter) in infrastructure layer",
    APPLICATION_USE_DI: "Use dependency injection to provide the implementation",
}

export const ENTITY_EXPOSURE_MESSAGES = {
    METHOD_DEFAULT: "Method",
    METHOD_DEFAULT_NAME: "getEntity",
}

export const FRAMEWORK_LEAK_MESSAGES = {
    DEFAULT_MESSAGE: "Domain layer should not depend on external frameworks",
}

export const REPOSITORY_PATTERN_MESSAGES = {
    UNKNOWN_TYPE: "Unknown",
    CONSTRUCTOR: "constructor",
    DEFAULT_SUGGESTION: "Follow Repository Pattern best practices",
    NO_EXAMPLE: "// No example available",
    STEP_REMOVE_ORM_TYPES: "1. Remove ORM-specific types from repository interface",
    STEP_USE_DOMAIN_TYPES: "2. Use domain types (entities, value objects) instead",
    STEP_KEEP_CLEAN: "3. Keep repository interface clean and persistence-agnostic",
    STEP_DEPEND_ON_INTERFACE: "1. Depend on repository interface (IUserRepository) in constructor",
    STEP_MOVE_TO_INFRASTRUCTURE: "2. Move concrete implementation to infrastructure layer",
    STEP_USE_DI: "3. Use dependency injection to provide implementation",
    STEP_REMOVE_NEW: "1. Remove 'new Repository()' from use case",
    STEP_INJECT_CONSTRUCTOR: "2. Inject repository through constructor",
    STEP_CONFIGURE_DI: "3. Configure dependency injection container",
    STEP_RENAME_METHOD: "1. Rename method to use domain language",
    STEP_REFLECT_BUSINESS: "2. Method names should reflect business operations",
    STEP_AVOID_TECHNICAL: "3. Avoid technical database terms (query, insert, select)",
    EXAMPLE_PREFIX: "Example:",
    BAD_ORM_EXAMPLE: "❌ Bad: findOne(query: Prisma.UserWhereInput)",
    GOOD_DOMAIN_EXAMPLE: "✅ Good: findById(id: UserId): Promise<User | null>",
    BAD_NEW_REPO: "❌ Bad: const repo = new UserRepository()",
    GOOD_INJECT_REPO: "✅ Good: constructor(private readonly userRepo: IUserRepository) {}",
    SUGGESTION_FINDONE: "findById",
    SUGGESTION_FINDMANY: "findAll or findByFilter",
    SUGGESTION_INSERT: "save or create",
    SUGGESTION_UPDATE: "save",
    SUGGESTION_DELETE: "remove or delete",
    SUGGESTION_QUERY: "find or search",
}

export const REPOSITORY_FALLBACK_SUGGESTIONS = {
    DEFAULT: "findById() or findByEmail()",
}

export const AGGREGATE_VIOLATION_MESSAGES = {
    USE_ID_REFERENCE: "1. Reference other aggregates by ID (UserId, OrderId) instead of entity",
    USE_VALUE_OBJECT:
        "2. Use Value Objects to store needed data from other aggregates (CustomerInfo, ProductSummary)",
    AVOID_DIRECT_REFERENCE: "3. Avoid direct entity references to maintain aggregate independence",
    MAINTAIN_INDEPENDENCE: "4. Each aggregate should be independently modifiable and deployable",
}

export const SECRET_VIOLATION_MESSAGES = {
    USE_ENV_VARIABLES: "1. Use environment variables for sensitive data (process.env.API_KEY)",
    USE_SECRET_MANAGER:
        "2. Use secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)",
    NEVER_COMMIT_SECRETS: "3. Never commit secrets to version control",
    ROTATE_IF_EXPOSED: "4. If secret was committed, rotate it immediately",
    USE_GITIGNORE: "5. Add secret files to .gitignore (.env, credentials.json, etc.)",
}

export const ANEMIC_MODEL_MESSAGES = {
    REMOVE_PUBLIC_SETTERS: "1. Remove public setters - they allow uncontrolled state changes",
    USE_METHODS_FOR_CHANGES: "2. Use business methods instead (approve(), cancel(), addItem())",
    ENCAPSULATE_INVARIANTS: "3. Encapsulate business rules and invariants in methods",
    ADD_BUSINESS_METHODS: "1. Add business logic methods to the entity",
    MOVE_LOGIC_FROM_SERVICES:
        "2. Move business logic from services to domain entities where it belongs",
    ENCAPSULATE_BUSINESS_RULES: "3. Encapsulate business rules inside entity methods",
    USE_DOMAIN_EVENTS: "4. Use domain events to communicate state changes",
}
