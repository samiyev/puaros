export const APP_CONSTANTS = {
    DEFAULT_TIMEOUT: 5000,
    MAX_RETRIES: 3,
    VERSION: "0.0.1",
} as const

export const ERROR_MESSAGES = {
    VALIDATION_FAILED: "Validation failed",
    NOT_FOUND: "Resource not found",
    UNAUTHORIZED: "Unauthorized access",
    INTERNAL_ERROR: "Internal server error",
    FAILED_TO_ANALYZE: "Failed to analyze project",
    FAILED_TO_SCAN_DIR: "Failed to scan directory",
    FAILED_TO_READ_FILE: "Failed to read file",
    ENTITY_NOT_FOUND: "Entity with id {id} not found",
} as const

/**
 * Error codes
 */
export const ERROR_CODES = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    UNAUTHORIZED: "UNAUTHORIZED",
    INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

/**
 * File extension constants
 */
export const FILE_EXTENSIONS = {
    TYPESCRIPT: ".ts",
    TYPESCRIPT_JSX: ".tsx",
    JAVASCRIPT: ".js",
    JAVASCRIPT_JSX: ".jsx",
} as const

/**
 * TypeScript primitive type names
 */
export const TYPE_NAMES = {
    STRING: "string",
    NUMBER: "number",
    BOOLEAN: "boolean",
    OBJECT: "object",
} as const

/**
 * TypeScript class and method keywords
 */
export const CLASS_KEYWORDS = {
    CONSTRUCTOR: "constructor",
    PUBLIC: "public",
    PRIVATE: "private",
    PROTECTED: "protected",
} as const

/**
 * Example code constants for documentation
 */
export const EXAMPLE_CODE_CONSTANTS = {
    ORDER_STATUS_PENDING: "pending",
    ORDER_STATUS_APPROVED: "approved",
    CANNOT_APPROVE_ERROR: "Cannot approve",
} as const

/**
 * Common regex patterns
 */
export const REGEX_PATTERNS = {
    IMPORT_STATEMENT: /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
    EXPORT_STATEMENT: /export\s+(?:class|function|const|let|var)\s+(\w+)/g,
} as const

/**
 * Placeholders for string templates
 */
export const PLACEHOLDERS = {
    ID: "{id}",
} as const

/**
 * Violation severity levels
 */
export const SEVERITY_LEVELS = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
} as const

export type SeverityLevel = (typeof SEVERITY_LEVELS)[keyof typeof SEVERITY_LEVELS]

/**
 * Severity order for sorting (lower number = more critical)
 */
export const SEVERITY_ORDER: Record<SeverityLevel, number> = {
    [SEVERITY_LEVELS.CRITICAL]: 0,
    [SEVERITY_LEVELS.HIGH]: 1,
    [SEVERITY_LEVELS.MEDIUM]: 2,
    [SEVERITY_LEVELS.LOW]: 3,
} as const

/**
 * Violation type to severity mapping
 */
export const VIOLATION_SEVERITY_MAP = {
    SECRET_EXPOSURE: SEVERITY_LEVELS.CRITICAL,
    CIRCULAR_DEPENDENCY: SEVERITY_LEVELS.CRITICAL,
    REPOSITORY_PATTERN: SEVERITY_LEVELS.CRITICAL,
    AGGREGATE_BOUNDARY: SEVERITY_LEVELS.CRITICAL,
    DEPENDENCY_DIRECTION: SEVERITY_LEVELS.HIGH,
    FRAMEWORK_LEAK: SEVERITY_LEVELS.HIGH,
    ENTITY_EXPOSURE: SEVERITY_LEVELS.HIGH,
    ANEMIC_MODEL: SEVERITY_LEVELS.MEDIUM,
    NAMING_CONVENTION: SEVERITY_LEVELS.MEDIUM,
    ARCHITECTURE: SEVERITY_LEVELS.MEDIUM,
    HARDCODE: SEVERITY_LEVELS.LOW,
} as const

export * from "./rules"
