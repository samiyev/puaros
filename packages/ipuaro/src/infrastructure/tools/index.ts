// Tools module exports
export { ToolRegistry } from "./registry.js"

// Read tools
export { GetLinesTool, type GetLinesResult } from "./read/GetLinesTool.js"
export { GetFunctionTool, type GetFunctionResult } from "./read/GetFunctionTool.js"
export { GetClassTool, type GetClassResult } from "./read/GetClassTool.js"
export {
    GetStructureTool,
    type GetStructureResult,
    type TreeNode,
} from "./read/GetStructureTool.js"

// Edit tools
export { EditLinesTool, type EditLinesResult } from "./edit/EditLinesTool.js"
export { CreateFileTool, type CreateFileResult } from "./edit/CreateFileTool.js"
export { DeleteFileTool, type DeleteFileResult } from "./edit/DeleteFileTool.js"

// Search tools
export {
    FindReferencesTool,
    type FindReferencesResult,
    type SymbolReference,
} from "./search/FindReferencesTool.js"
export {
    FindDefinitionTool,
    type FindDefinitionResult,
    type DefinitionLocation,
} from "./search/FindDefinitionTool.js"

// Analysis tools
export {
    GetDependenciesTool,
    type GetDependenciesResult,
    type DependencyEntry,
} from "./analysis/GetDependenciesTool.js"

export {
    GetDependentsTool,
    type GetDependentsResult,
    type DependentEntry,
} from "./analysis/GetDependentsTool.js"

export {
    GetComplexityTool,
    type GetComplexityResult,
    type ComplexityEntry,
} from "./analysis/GetComplexityTool.js"

export {
    GetTodosTool,
    type GetTodosResult,
    type TodoEntry,
    type TodoType,
} from "./analysis/GetTodosTool.js"
