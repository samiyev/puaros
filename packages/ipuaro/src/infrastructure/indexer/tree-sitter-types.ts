/**
 * Tree-sitter node type constants for TypeScript/JavaScript parsing.
 * These are infrastructure-level constants, not exposed to domain/application layers.
 *
 * Source: tree-sitter-typescript/typescript/src/node-types.json
 */

export const NodeType = {
    // Statements
    IMPORT_STATEMENT: "import_statement",
    EXPORT_STATEMENT: "export_statement",
    LEXICAL_DECLARATION: "lexical_declaration",

    // Declarations
    FUNCTION_DECLARATION: "function_declaration",
    CLASS_DECLARATION: "class_declaration",
    INTERFACE_DECLARATION: "interface_declaration",
    TYPE_ALIAS_DECLARATION: "type_alias_declaration",
    ENUM_DECLARATION: "enum_declaration",

    // Clauses
    IMPORT_CLAUSE: "import_clause",
    EXPORT_CLAUSE: "export_clause",
    EXTENDS_CLAUSE: "extends_clause",
    IMPLEMENTS_CLAUSE: "implements_clause",
    EXTENDS_TYPE_CLAUSE: "extends_type_clause",
    CLASS_HERITAGE: "class_heritage",

    // Import specifiers
    NAMESPACE_IMPORT: "namespace_import",
    NAMED_IMPORTS: "named_imports",
    IMPORT_SPECIFIER: "import_specifier",
    EXPORT_SPECIFIER: "export_specifier",

    // Class members
    METHOD_DEFINITION: "method_definition",
    PUBLIC_FIELD_DEFINITION: "public_field_definition",
    FIELD_DEFINITION: "field_definition",
    PROPERTY_SIGNATURE: "property_signature",

    // Enum members
    ENUM_BODY: "enum_body",
    ENUM_ASSIGNMENT: "enum_assignment",
    PROPERTY_IDENTIFIER: "property_identifier",

    // Parameters
    REQUIRED_PARAMETER: "required_parameter",
    OPTIONAL_PARAMETER: "optional_parameter",

    // Expressions & values
    ARROW_FUNCTION: "arrow_function",
    FUNCTION: "function",
    VARIABLE_DECLARATOR: "variable_declarator",

    // Identifiers & types
    IDENTIFIER: "identifier",
    TYPE_IDENTIFIER: "type_identifier",

    // Modifiers
    ASYNC: "async",
    STATIC: "static",
    ABSTRACT: "abstract",
    DEFAULT: "default",
    ACCESSIBILITY_MODIFIER: "accessibility_modifier",
    READONLY: "readonly",

    // Decorators
    DECORATOR: "decorator",
} as const

export type NodeTypeValue = (typeof NodeType)[keyof typeof NodeType]

export const FieldName = {
    SOURCE: "source",
    NAME: "name",
    ALIAS: "alias",
    DECLARATION: "declaration",
    PARAMETERS: "parameters",
    RETURN_TYPE: "return_type",
    BODY: "body",
    TYPE: "type",
    PATTERN: "pattern",
    VALUE: "value",
} as const

export type FieldNameValue = (typeof FieldName)[keyof typeof FieldName]
