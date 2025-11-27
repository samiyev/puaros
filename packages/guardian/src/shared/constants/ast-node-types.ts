/**
 * Abstract Syntax Tree (AST) node type constants
 *
 * These constants represent tree-sitter AST node types used for code analysis.
 * Using constants instead of magic strings improves maintainability and prevents typos.
 *
 * @see https://tree-sitter.github.io/tree-sitter/
 */

/**
 * Class and interface declaration node types
 */
export const AST_CLASS_TYPES = {
    CLASS_DECLARATION: "class_declaration",
    INTERFACE_DECLARATION: "interface_declaration",
} as const

/**
 * Function and method node types
 */
export const AST_FUNCTION_TYPES = {
    FUNCTION_DECLARATION: "function_declaration",
    METHOD_DEFINITION: "method_definition",
    FUNCTION_SIGNATURE: "function_signature",
} as const

/**
 * Variable and parameter node types
 */
export const AST_VARIABLE_TYPES = {
    VARIABLE_DECLARATOR: "variable_declarator",
    REQUIRED_PARAMETER: "required_parameter",
    OPTIONAL_PARAMETER: "optional_parameter",
    PUBLIC_FIELD_DEFINITION: "public_field_definition",
    PROPERTY_SIGNATURE: "property_signature",
} as const

/**
 * Type system node types
 */
export const AST_TYPE_TYPES = {
    TYPE_ALIAS_DECLARATION: "type_alias_declaration",
    UNION_TYPE: "union_type",
    LITERAL_TYPE: "literal_type",
    TYPE_ANNOTATION: "type_annotation",
} as const

/**
 * Statement node types
 */
export const AST_STATEMENT_TYPES = {
    EXPORT_STATEMENT: "export_statement",
    IMPORT_STATEMENT: "import_statement",
    LEXICAL_DECLARATION: "lexical_declaration",
} as const

/**
 * Expression node types
 */
export const AST_EXPRESSION_TYPES = {
    CALL_EXPRESSION: "call_expression",
    AS_EXPRESSION: "as_expression",
} as const

/**
 * Field and property node types
 */
export const AST_FIELD_TYPES = {
    FIELD_DEFINITION: "field_definition",
} as const

/**
 * Pattern node types
 */
export const AST_PATTERN_TYPES = {
    OBJECT_PATTERN: "object_pattern",
    ARRAY_PATTERN: "array_pattern",
} as const

/**
 * Modifier node types
 */
export const AST_MODIFIER_TYPES = {
    READONLY: "readonly",
    STATIC: "static",
    CONST: "const",
} as const

/**
 * Special identifier node types
 */
export const AST_IDENTIFIER_TYPES = {
    IDENTIFIER: "identifier",
    TYPE_IDENTIFIER: "type_identifier",
    PROPERTY_IDENTIFIER: "property_identifier",
    IMPORT: "import",
} as const

/**
 * Node field names used with childForFieldName()
 */
export const AST_FIELD_NAMES = {
    NAME: "name",
    DECLARATION: "declaration",
    VALUE: "value",
    FUNCTION: "function",
} as const

/**
 * String fragment node type
 */
export const AST_STRING_TYPES = {
    STRING_FRAGMENT: "string_fragment",
} as const

/**
 * Common JavaScript timer functions
 */
export const TIMER_FUNCTIONS = {
    SET_TIMEOUT: "setTimeout",
    SET_INTERVAL: "setInterval",
} as const

/**
 * Value pattern types for pattern matching
 */
export const VALUE_PATTERN_TYPES = {
    EMAIL: "email",
    API_KEY: "api_key",
    URL: "url",
    IP_ADDRESS: "ip_address",
    FILE_PATH: "file_path",
    DATE: "date",
    UUID: "uuid",
    VERSION: "version",
    JWT: "jwt",
    MAC_ADDRESS: "mac_address",
    BASE64: "base64",
} as const
