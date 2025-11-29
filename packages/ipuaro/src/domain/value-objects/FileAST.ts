/**
 * Represents parsed AST information for a file.
 */

export interface ImportInfo {
    /** Import name or alias */
    name: string
    /** Source module path */
    from: string
    /** Line number of import statement */
    line: number
    /** Import type classification */
    type: "internal" | "external" | "builtin"
    /** Whether it's a default import */
    isDefault: boolean
}

export interface ExportInfo {
    /** Exported name */
    name: string
    /** Line number of export */
    line: number
    /** Whether it's a default export */
    isDefault: boolean
    /** Export type: function, class, variable, type */
    kind: "function" | "class" | "variable" | "type" | "interface"
}

export interface ParameterInfo {
    /** Parameter name */
    name: string
    /** Parameter type (if available) */
    type?: string
    /** Whether it's optional */
    optional: boolean
    /** Whether it has a default value */
    hasDefault: boolean
}

export interface FunctionInfo {
    /** Function name */
    name: string
    /** Start line number */
    lineStart: number
    /** End line number */
    lineEnd: number
    /** Function parameters */
    params: ParameterInfo[]
    /** Whether function is async */
    isAsync: boolean
    /** Whether function is exported */
    isExported: boolean
    /** Return type (if available) */
    returnType?: string
}

export interface MethodInfo {
    /** Method name */
    name: string
    /** Start line number */
    lineStart: number
    /** End line number */
    lineEnd: number
    /** Method parameters */
    params: ParameterInfo[]
    /** Whether method is async */
    isAsync: boolean
    /** Method visibility */
    visibility: "public" | "private" | "protected"
    /** Whether it's static */
    isStatic: boolean
}

export interface PropertyInfo {
    /** Property name */
    name: string
    /** Line number */
    line: number
    /** Property type (if available) */
    type?: string
    /** Property visibility */
    visibility: "public" | "private" | "protected"
    /** Whether it's static */
    isStatic: boolean
    /** Whether it's readonly */
    isReadonly: boolean
}

export interface ClassInfo {
    /** Class name */
    name: string
    /** Start line number */
    lineStart: number
    /** End line number */
    lineEnd: number
    /** Class methods */
    methods: MethodInfo[]
    /** Class properties */
    properties: PropertyInfo[]
    /** Extended class name */
    extends?: string
    /** Implemented interfaces */
    implements: string[]
    /** Whether class is exported */
    isExported: boolean
    /** Whether class is abstract */
    isAbstract: boolean
}

export interface InterfaceInfo {
    /** Interface name */
    name: string
    /** Start line number */
    lineStart: number
    /** End line number */
    lineEnd: number
    /** Interface properties */
    properties: PropertyInfo[]
    /** Extended interfaces */
    extends: string[]
    /** Whether interface is exported */
    isExported: boolean
}

export interface TypeAliasInfo {
    /** Type alias name */
    name: string
    /** Line number */
    line: number
    /** Whether it's exported */
    isExported: boolean
}

export interface FileAST {
    /** Import statements */
    imports: ImportInfo[]
    /** Export statements */
    exports: ExportInfo[]
    /** Function declarations */
    functions: FunctionInfo[]
    /** Class declarations */
    classes: ClassInfo[]
    /** Interface declarations */
    interfaces: InterfaceInfo[]
    /** Type alias declarations */
    typeAliases: TypeAliasInfo[]
    /** Whether parsing encountered errors */
    parseError: boolean
    /** Parse error message if any */
    parseErrorMessage?: string
}

export function createEmptyFileAST(): FileAST {
    return {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        interfaces: [],
        typeAliases: [],
        parseError: false,
    }
}
