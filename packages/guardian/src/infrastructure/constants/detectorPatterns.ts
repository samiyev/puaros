/**
 * Naming Convention Detector Constants
 *
 * Following Clean Code principles:
 * - No magic strings
 * - Single source of truth
 * - Easy to maintain
 */

/**
 * Files to exclude from naming convention checks
 */
export const EXCLUDED_FILES = [
    "index.ts",
    "BaseUseCase.ts",
    "BaseMapper.ts",
    "IBaseRepository.ts",
    "BaseEntity.ts",
    "ValueObject.ts",
    "BaseRepository.ts",
    "BaseError.ts",
    "DomainEvent.ts",
    "Suggestions.ts",
] as const

/**
 * File suffixes for pattern matching
 */
export const FILE_SUFFIXES = {
    SERVICE: "Service.ts",
    DTO: "Dto.ts",
    REQUEST: "Request.ts",
    RESPONSE: "Response.ts",
    MAPPER: "Mapper.ts",
    CONTROLLER: "Controller.ts",
    REPOSITORY: "Repository.ts",
    ADAPTER: "Adapter.ts",
} as const

/**
 * Path patterns for detection
 */
export const PATH_PATTERNS = {
    USE_CASES: "/use-cases/",
    USE_CASES_ALT: "/usecases/",
} as const

/**
 * Common words for pattern matching
 */
export const PATTERN_WORDS = {
    REPOSITORY: "Repository",
    I_PREFIX: "I",
} as const

/**
 * Error messages for naming violations
 */
export const NAMING_ERROR_MESSAGES = {
    DOMAIN_FORBIDDEN:
        "Domain layer should not contain DTOs, Controllers, or Request/Response objects",
    USE_PASCAL_CASE: "Use PascalCase noun (e.g., User.ts, Order.ts, Email.ts)",
    USE_DTO_SUFFIX: "Use *Dto, *Request, or *Response suffix (e.g., UserResponseDto.ts)",
    USE_VERB_NOUN: "Use verb + noun in PascalCase (e.g., CreateUser.ts, UpdateProfile.ts)",
    USE_CASE_START_VERB: "Use cases should start with a verb",
    DOMAIN_SERVICE_PASCAL_CASE: "Domain services must be PascalCase ending with 'Service'",
    DOMAIN_ENTITY_PASCAL_CASE: "Domain entities must be PascalCase nouns",
    DTO_PASCAL_CASE: "DTOs must be PascalCase ending with 'Dto', 'Request', or 'Response'",
    MAPPER_PASCAL_CASE: "Mappers must be PascalCase ending with 'Mapper'",
    USE_CASE_VERB_NOUN: "Use cases must be PascalCase Verb+Noun (e.g., CreateUser)",
    CONTROLLER_PASCAL_CASE: "Controllers must be PascalCase ending with 'Controller'",
    REPOSITORY_IMPL_PASCAL_CASE:
        "Repository implementations must be PascalCase ending with 'Repository'",
    SERVICE_ADAPTER_PASCAL_CASE:
        "Services/Adapters must be PascalCase ending with 'Service' or 'Adapter'",
    FUNCTION_CAMEL_CASE: "Functions and methods must be camelCase",
    USE_CAMEL_CASE_FUNCTION: "Use camelCase for function names (e.g., getUserById, createOrder)",
    INTERFACE_PASCAL_CASE: "Interfaces must be PascalCase",
    USE_PASCAL_CASE_INTERFACE: "Use PascalCase for interface names",
    REPOSITORY_INTERFACE_I_PREFIX:
        "Domain repository interfaces must start with 'I' (e.g., IUserRepository)",
    REPOSITORY_INTERFACE_PATTERN: "Repository interfaces must be I + PascalCase + Repository",
    CONSTANT_UPPER_SNAKE_CASE: "Exported constants must be UPPER_SNAKE_CASE",
    USE_UPPER_SNAKE_CASE_CONSTANT:
        "Use UPPER_SNAKE_CASE for constant names (e.g., MAX_RETRIES, API_URL)",
    VARIABLE_CAMEL_CASE: "Variables must be camelCase",
    USE_CAMEL_CASE_VARIABLE: "Use camelCase for variable names (e.g., userId, orderList)",
} as const

/**
 * DDD folder names for aggregate boundary detection
 */
export const DDD_FOLDER_NAMES = {
    ENTITIES: "entities",
    AGGREGATES: "aggregates",
    VALUE_OBJECTS: "value-objects",
    VO: "vo",
    EVENTS: "events",
    DOMAIN_EVENTS: "domain-events",
    REPOSITORIES: "repositories",
    SERVICES: "services",
    SPECIFICATIONS: "specifications",
    DOMAIN: "domain",
    CONSTANTS: "constants",
    SHARED: "shared",
    FACTORIES: "factories",
    PORTS: "ports",
    INTERFACES: "interfaces",
    ERRORS: "errors",
    EXCEPTIONS: "exceptions",
} as const

/**
 * Repository method suggestions for domain language
 */
export const REPOSITORY_METHOD_SUGGESTIONS = {
    SEARCH: "search",
    FIND_BY_PROPERTY: "findBy[Property]",
    GET_ENTITY: "get[Entity]",
    CREATE: "create",
    ADD_ENTITY: "add[Entity]",
    STORE_ENTITY: "store[Entity]",
    UPDATE: "update",
    MODIFY_ENTITY: "modify[Entity]",
    SAVE: "save",
    DELETE: "delete",
    REMOVE_BY_PROPERTY: "removeBy[Property]",
    FIND_ALL: "findAll",
    LIST_ALL: "listAll",
    DEFAULT_SUGGESTION:
        "Use domain-specific names like: findBy[Property], save, create, delete, update, add[Entity]",
} as const
