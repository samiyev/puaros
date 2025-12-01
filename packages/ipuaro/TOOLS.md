# ipuaro Tools Reference

Complete documentation for all 18 tools available to the AI agent.

## Table of Contents

- [Read Tools](#read-tools)
- [Edit Tools](#edit-tools)
- [Search Tools](#search-tools)
- [Analysis Tools](#analysis-tools)
- [Git Tools](#git-tools)
- [Run Tools](#run-tools)
- [Tool Confirmation](#tool-confirmation)
- [Error Handling](#error-handling)

## Tool Categories

| Category | Count | Requires Confirmation |
|----------|-------|----------------------|
| Read | 4 | No |
| Edit | 3 | Yes |
| Search | 2 | No |
| Analysis | 4 | No |
| Git | 3 | git_commit only |
| Run | 2 | run_command (conditional) |

---

## Read Tools

Tools for reading code without modification. Never require confirmation.

### get_lines

Read specific lines from a file.

**Signature**:
```typescript
get_lines(path: string, start?: number, end?: number): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path from project root
- `start` (number, optional): Starting line number (1-indexed). Default: 1
- `end` (number, optional): Ending line number (inclusive). Default: last line

**Returns**:
```typescript
{
    success: true,
    output: string  // Lines with line numbers (cat -n format)
}
```

**Examples**:

```typescript
// Read entire file
get_lines("src/auth/service.ts")
// Returns all lines with line numbers

// Read specific range
get_lines("src/auth/service.ts", 45, 67)
// Returns lines 45-67 only

// Read from line 100 to end
get_lines("src/config.ts", 100)
// Returns lines 100 to EOF
```

**Use Cases**:
- View file contents
- Get context around a specific line
- Check implementation details

**Error Cases**:
- File not found
- Invalid line numbers (out of range)
- Path outside project root

---

### get_function

Get a specific function's source code and metadata from a file.

**Signature**:
```typescript
get_function(path: string, name: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path to file
- `name` (string, required): Function name

**Returns**:
```typescript
{
    success: true,
    output: {
        name: string
        code: string          // Function source with line numbers
        lineStart: number
        lineEnd: number
        params: string[]
        isAsync: boolean
        isExported: boolean
        returnType?: string
    }
}
```

**Examples**:

```typescript
// Get a named function
get_function("src/auth/service.ts", "login")
// Returns login function code and metadata

// Get an arrow function
get_function("src/utils/date.ts", "formatDate")
// Works with const formatDate = () => {}

// Get a class method
get_function("src/services/user.ts", "UserService.findById")
// Use ClassName.methodName for class methods
```

**Use Cases**:
- Understand how a specific function works
- Get function signature before calling it
- Check if function is async/exported

**Error Cases**:
- File not found
- Function not found (returns list of available functions)
- File not indexed (falls back to reading entire file)

---

### get_class

Get a specific class's source code and metadata from a file.

**Signature**:
```typescript
get_class(path: string, name: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path to file
- `name` (string, required): Class name

**Returns**:
```typescript
{
    success: true,
    output: {
        name: string
        code: string          // Class source with line numbers
        lineStart: number
        lineEnd: number
        methods: Array<{
            name: string
            isStatic: boolean
            isAsync: boolean
            params: string[]
        }>
        properties: Array<{
            name: string
            isStatic: boolean
            isReadonly: boolean
        }>
        isAbstract: boolean
        extends?: string
        implements: string[]
        isExported: boolean
    }
}
```

**Examples**:

```typescript
// Get a class
get_class("src/services/user.ts", "UserService")
// Returns entire class with all methods and properties

// Get an abstract class
get_class("src/base/service.ts", "BaseService")
// Includes isAbstract: true

// Get a class with inheritance
get_class("src/auth/service.ts", "AuthService")
// Returns extends and implements info
```

**Use Cases**:
- Understand class structure
- See all methods and properties
- Check inheritance hierarchy

**Error Cases**:
- File not found
- Class not found (returns list of available classes)
- File not indexed

---

### get_structure

Get directory tree structure in ASCII format.

**Signature**:
```typescript
get_structure(path?: string, depth?: number): ToolResult
```

**Parameters**:
- `path` (string, optional): Relative path to directory. Default: project root
- `depth` (number, optional): Max depth to traverse. Default: unlimited

**Returns**:
```typescript
{
    success: true,
    output: string  // ASCII tree with stats
}
```

**Example Output**:
```
src/
├── 📁 auth/
│   ├── 📄 service.ts
│   ├── 📄 middleware.ts
│   └── 📄 types.ts
├── 📁 services/
│   ├── 📄 user.ts
│   └── 📄 post.ts
└── 📄 index.ts

Stats: 2 directories, 6 files
```

**Examples**:

```typescript
// Get entire project structure
get_structure()
// Returns full tree

// Get specific directory
get_structure("src/auth")
// Returns only auth/ contents

// Limit depth
get_structure("src", 2)
// Only show 2 levels deep
```

**Filters Applied**:
- `.gitignore` patterns
- `node_modules`, `.git`, `dist`, `coverage`, etc.
- Binary files

**Use Cases**:
- Understand project organization
- Find relevant files/folders
- Get overview before diving into code

**Error Cases**:
- Directory not found
- Path outside project root

---

## Edit Tools

Tools for modifying files. All require user confirmation.

### edit_lines

Replace lines in a file.

**Signature**:
```typescript
edit_lines(path: string, start: number, end: number, content: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path to file
- `start` (number, required): Starting line number (1-indexed)
- `end` (number, required): Ending line number (inclusive)
- `content` (string, required): New content to replace lines

**Behavior**:
1. Validates path (must be within project)
2. Checks file hash (detects external changes)
3. Generates diff preview
4. Asks user for confirmation
5. Creates undo entry
6. Applies changes
7. Updates storage (lines, hash, AST, meta)

**Returns**:
```typescript
{
    success: true,
    output: string  // Confirmation message with changes
}
```

**Examples**:

```typescript
// Replace a single line
edit_lines("src/config.ts", 23, 23, "  timeout: 5000,")
// Changes line 23 only

// Replace multiple lines
edit_lines("src/auth/service.ts", 45, 52,
`    async login(email: string, password: string) {
        // New implementation
        return this.authenticate(email, password)
    }`)
// Replaces lines 45-52 with new implementation

// Delete lines (replace with empty)
edit_lines("src/old-code.ts", 10, 20, "")
// Removes lines 10-20
```

**Confirmation Dialog**:
```
┌─── Edit: src/config.ts (lines 23) ───┐
│ - 23:   timeout: 3000,                │
│ + 23:   timeout: 5000,                │
│                                       │
│ [Y] Apply  [N] Cancel  [E] Edit      │
└───────────────────────────────────────┘
```

**Undo**:
```typescript
// Undo last edit
/undo
// Restores original content if file unchanged since edit
```

**Use Cases**:
- Fix bugs
- Refactor code
- Update configuration
- Add new code

**Error Cases**:
- File not found
- Invalid line range
- Hash conflict (file changed externally)
- Path outside project root

---

### create_file

Create a new file with content.

**Signature**:
```typescript
create_file(path: string, content: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path for new file
- `content` (string, required): File content

**Behavior**:
1. Validates path
2. Checks file doesn't exist
3. Creates parent directories if needed
4. Asks user for confirmation
5. Creates file
6. Indexes new file (AST, meta)
7. Stores in Redis

**Returns**:
```typescript
{
    success: true,
    output: string  // Confirmation message
}
```

**Examples**:

```typescript
// Create a new TypeScript file
create_file("src/utils/date.ts",
`export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
}

export function parseDate(str: string): Date {
    return new Date(str)
}
`)

// Create a new test file
create_file("tests/auth.test.ts",
`import { describe, it, expect } from 'vitest'
import { login } from '../src/auth/service'

describe('login', () => {
    it('should authenticate valid user', async () => {
        // Test implementation
    })
})
`)

// Create a config file
create_file(".env.example",
`DATABASE_URL=postgresql://localhost/myapp
REDIS_URL=redis://localhost:6379
`)
```

**Confirmation Dialog**:
```
┌─── Create: src/utils/date.ts ───┐
│ export function formatDate...    │
│ (22 lines)                       │
│                                  │
│ [Y] Create  [N] Cancel           │
└──────────────────────────────────┘
```

**Use Cases**:
- Add new features
- Create test files
- Generate boilerplate code
- Add documentation

**Error Cases**:
- File already exists
- Invalid path
- Path outside project root
- Permission denied

---

### delete_file

Delete a file from filesystem and storage.

**Signature**:
```typescript
delete_file(path: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path to file

**Behavior**:
1. Validates path
2. Checks file exists
3. Shows file content preview
4. Asks user for confirmation
5. Deletes from filesystem
6. Removes from Redis (file, AST, meta)
7. Updates dependency graph

**Returns**:
```typescript
{
    success: true,
    output: string  // Confirmation message
}
```

**Examples**:

```typescript
// Delete a test file
delete_file("tests/old-test.test.ts")

// Delete unused code
delete_file("src/legacy/deprecated.ts")

// Delete config
delete_file(".env.local")
```

**Confirmation Dialog**:
```
┌─── Delete: tests/old-test.test.ts ───┐
│ File contents:                        │
│ import { test } from 'vitest'...     │
│ (45 lines)                           │
│                                      │
│ [Y] Delete  [N] Cancel               │
└──────────────────────────────────────┘
```

**Warning**: Deletion cannot be undone via `/undo` (file is gone).

**Use Cases**:
- Remove obsolete code
- Clean up after refactoring
- Delete generated files

**Error Cases**:
- File not found
- Path outside project root
- Permission denied

---

## Search Tools

Tools for finding code across the codebase.

### find_references

Find all usages of a symbol across the codebase.

**Signature**:
```typescript
find_references(symbol: string, path?: string): ToolResult
```

**Parameters**:
- `symbol` (string, required): Symbol name to search for
- `path` (string, optional): Limit search to specific path

**Returns**:
```typescript
{
    success: true,
    output: {
        symbol: string
        totalReferences: number
        references: Array<{
            path: string
            line: number
            column: number
            context: string[]      // Lines around reference
            isDefinition: boolean
        }>
    }
}
```

**Examples**:

```typescript
// Find all usages of a function
find_references("getUserById")
// Returns every place where getUserById is called

// Find usages in specific directory
find_references("ApiClient", "src/services")
// Only search src/services/

// Find variable usages
find_references("config")
// Includes imports, assignments, accesses
```

**Example Output**:
```
Symbol: getUserById
Total references: 8

1. src/services/user.ts:12 (definition)
   11: export class UserService {
   12:   async getUserById(id: string) {
   13:     return this.db.users.findOne({ id })

2. src/controllers/user.ts:45
   44: const user = await userService
   45:   .getUserById(req.params.id)
   46: if (!user) throw new NotFoundError()

[... more references ...]
```

**Use Cases**:
- Find all callers of a function
- Check impact of API changes
- Understand how a variable is used
- Locate all imports of a module

**Error Cases**:
- Symbol not found (empty results)
- Invalid path

---

### find_definition

Find where a symbol is defined.

**Signature**:
```typescript
find_definition(symbol: string): ToolResult
```

**Parameters**:
- `symbol` (string, required): Symbol name to find

**Returns**:
```typescript
{
    success: true,
    output: {
        symbol: string
        definitions: Array<{
            path: string
            line: number
            type: "function" | "class" | "interface" | "type" | "variable" | "const"
            context: string[]  // Lines around definition
        }>
    }
}
```

**Examples**:

```typescript
// Find function definition
find_definition("login")
// Returns: src/auth/service.ts:45, type: function

// Find class definition
find_definition("UserService")
// Returns: src/services/user.ts:12, type: class

// Find type definition
find_definition("User")
// Returns: src/types/user.ts:5, type: interface
```

**Example Output**:
```
Symbol: UserService
Found 1 definition:

src/services/user.ts:12 (class)
   11:
   12: export class UserService {
   13:   constructor(private db: Database) {}
   14:
```

**Multiple Definitions**:
```typescript
// Symbol defined in multiple places (overloads, re-exports)
find_definition("Logger")
// Returns all definitions
```

**Fuzzy Matching**:
If symbol not found, suggests similar symbols:
```
Symbol 'getUserByid' not found.

Did you mean?
  - getUserById (src/services/user.ts:45)
  - getUserByEmail (src/services/user.ts:67)
```

**Use Cases**:
- Jump to symbol definition
- Understand type signatures
- Find interface definitions
- Locate imports

**Error Cases**:
- Symbol not found (with suggestions)

---

## Analysis Tools

Tools for analyzing code structure and quality.

### get_dependencies

Get files that a specific file imports.

**Signature**:
```typescript
get_dependencies(path: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path to file

**Returns**:
```typescript
{
    success: true,
    output: {
        path: string
        dependencies: Array<{
            path: string
            exists: boolean
            isHub: boolean
            isEntryPoint: boolean
            fileType: "source" | "test" | "config" | "types" | "unknown"
        }>
        totalDependencies: number
    }
}
```

**Examples**:

```typescript
// Get dependencies of a service
get_dependencies("src/services/user.ts")
// Returns all files it imports

// Check test dependencies
get_dependencies("tests/auth.test.ts")
// Shows what the test imports
```

**Example Output**:
```
File: src/services/user.ts
Dependencies: 5

1. src/types/user.ts
   Type: types, EntryPoint: no, Hub: no

2. src/db/index.ts
   Type: source, EntryPoint: yes, Hub: yes (12 dependents)

3. src/utils/validation.ts
   Type: source, EntryPoint: no, Hub: no

4. src/errors/not-found.ts
   Type: source, EntryPoint: no, Hub: no

5. ../config.ts
   Type: config, EntryPoint: yes, Hub: yes (23 dependents)
```

**Use Cases**:
- Understand file dependencies
- Identify circular dependencies
- Check import impacts
- Analyze module coupling

**Error Cases**:
- File not found
- File not indexed

---

### get_dependents

Get files that import a specific file.

**Signature**:
```typescript
get_dependents(path: string): ToolResult
```

**Parameters**:
- `path` (string, required): Relative path to file

**Returns**:
```typescript
{
    success: true,
    output: {
        path: string
        isHub: boolean         // >5 dependents
        dependents: Array<{
            path: string
            isHub: boolean
            isEntryPoint: boolean
            fileType: string
            complexityScore: number
        }>
        totalDependents: number
    }
}
```

**Examples**:

```typescript
// Check who imports a module
get_dependents("src/db/index.ts")
// Returns all files importing it

// Check if file is a hub
get_dependents("src/types/user.ts")
// If >5 dependents, isHub: true
```

**Example Output**:
```
File: src/types/user.ts
Hub: yes (12 dependents)
Dependents: 12

1. src/services/user.ts
   Complexity: 45, Type: source

2. src/controllers/user.ts
   Complexity: 32, Type: source

[... more dependents ...]

Warning: This is a hub file. Changes may impact 12 other files.
```

**Use Cases**:
- Assess impact of changes
- Identify hub files (heavily depended upon)
- Find orphaned files (0 dependents)
- Plan refactoring

**Error Cases**:
- File not found
- File not indexed

---

### get_complexity

Get complexity metrics for files.

**Signature**:
```typescript
get_complexity(path?: string, limit?: number): ToolResult
```

**Parameters**:
- `path` (string, optional): Specific file or directory. Default: all files
- `limit` (number, optional): Max files to return. Default: 20

**Returns**:
```typescript
{
    success: true,
    output: {
        files: Array<{
            path: string
            loc: number              // Lines of code (no comments)
            nestingDepth: number
            cyclomaticComplexity: number
            score: number            // Overall complexity (0-100)
        }>
        summary: {
            totalFiles: number
            highComplexity: number   // score > 70
            mediumComplexity: number // score 40-70
            lowComplexity: number    // score < 40
            averageScore: number
        }
    }
}
```

**Complexity Score**:
```
score = (loc * 0.4) + (nesting * 15) + (cyclomatic * 10)

Low: < 40
Medium: 40-70
High: > 70
```

**Examples**:

```typescript
// Get most complex files
get_complexity()
// Returns top 20 by complexity score

// Get complexity for specific file
get_complexity("src/services/user.ts")
// Returns metrics for that file only

// Get top 10 most complex
get_complexity(null, 10)
// Limit to 10 results
```

**Example Output**:
```
Complexity Report (top 10):

1. src/services/auth.ts (score: 87)
   LOC: 345, Nesting: 5, Cyclomatic: 28

2. src/parsers/ast.ts (score: 76)
   LOC: 289, Nesting: 4, Cyclomatic: 22

[... more files ...]

Summary:
  Total files: 145
  High complexity: 8
  Medium complexity: 42
  Low complexity: 95
  Average score: 34.5
```

**Use Cases**:
- Identify refactoring candidates
- Code review prioritization
- Track complexity over time
- Enforce complexity limits

**Error Cases**:
- Path not found
- No files indexed

---

### get_todos

Find TODO/FIXME/HACK/XXX/BUG/NOTE comments.

**Signature**:
```typescript
get_todos(path?: string, type?: string): ToolResult
```

**Parameters**:
- `path` (string, optional): Specific file or directory. Default: all files
- `type` (string, optional): Filter by type (TODO, FIXME, etc.). Case-insensitive

**Returns**:
```typescript
{
    success: true,
    output: {
        todos: Array<{
            path: string
            line: number
            type: "TODO" | "FIXME" | "HACK" | "XXX" | "BUG" | "NOTE"
            text: string
            context: string  // Line with todo
        }>
        summary: {
            total: number
            byType: Record<string, number>
        }
    }
}
```

**Supported Comment Styles**:
- `// TODO: text`
- `/* TODO: text */`
- `# TODO: text` (for config files)

**Examples**:

```typescript
// Find all TODOs
get_todos()
// Returns all TODO comments

// Find TODOs in specific directory
get_todos("src/auth")
// Only search auth/

// Find only FIXMEs
get_todos(null, "FIXME")
// Filter by type
```

**Example Output**:
```
Found 23 TODO comments:

1. src/auth/service.ts:45
   Type: TODO
   Text: Implement password reset flow
   Context: // TODO: Implement password reset flow

2. src/db/migrations.ts:128
   Type: FIXME
   Text: Handle transaction rollback properly
   Context: // FIXME: Handle transaction rollback properly

[... more todos ...]

Summary:
  Total: 23
  By type:
    TODO: 15
    FIXME: 6
    HACK: 2
```

**Use Cases**:
- Track technical debt
- Sprint planning
- Code review
- Identify unfinished work

**Error Cases**:
- Path not found
- No TODOs found (empty results)

---

## Git Tools

Tools for git operations.

### git_status

Get current git repository status.

**Signature**:
```typescript
git_status(): ToolResult
```

**Parameters**: None

**Returns**:
```typescript
{
    success: true,
    output: {
        branch: string
        tracking?: string     // Remote tracking branch
        ahead: number
        behind: number
        detached: boolean
        files: {
            staged: string[]
            modified: string[]
            untracked: string[]
            conflicted: string[]
        }
    }
}
```

**Example**:

```typescript
git_status()
```

**Example Output**:
```
Branch: feature/auth
Tracking: origin/feature/auth
Ahead: 2 commits, Behind: 0 commits

Staged (3):
  - src/auth/service.ts
  - src/auth/middleware.ts
  - tests/auth.test.ts

Modified (1):
  - src/config.ts

Untracked (2):
  - .env.local
  - temp.txt
```

**Use Cases**:
- Check working tree status
- Before committing changes
- Verify staged files
- Check branch status

**Error Cases**:
- Not a git repository
- Git not installed

---

### git_diff

Get uncommitted changes.

**Signature**:
```typescript
git_diff(path?: string, staged?: boolean): ToolResult
```

**Parameters**:
- `path` (string, optional): Specific file or directory. Default: all changes
- `staged` (boolean, optional): Show staged changes only. Default: false

**Returns**:
```typescript
{
    success: true,
    output: {
        files: Array<{
            path: string
            insertions: number
            deletions: number
            binary: boolean
        }>
        totalInsertions: number
        totalDeletions: number
        diff: string  // Full diff text
    }
}
```

**Examples**:

```typescript
// All uncommitted changes
git_diff()

// Changes in specific file
git_diff("src/auth/service.ts")

// Staged changes only
git_diff(null, true)
```

**Example Output**:
```
Changes in 3 files:
  +42  -15  src/auth/service.ts
   +8   -2  src/auth/middleware.ts
   +5   -0  tests/auth.test.ts

Total: +55 insertions, -17 deletions

diff --git a/src/auth/service.ts b/src/auth/service.ts
index abc123..def456 100644
--- a/src/auth/service.ts
+++ b/src/auth/service.ts
@@ -45,7 +45,10 @@ class AuthService {
-    timeout: 3000
+    timeout: 5000
[... more diff ...]
```

**Use Cases**:
- Review changes before commit
- Check what was modified
- Generate commit messages
- Code review

**Error Cases**:
- Not a git repository
- File not found
- No changes to show

---

### git_commit

Create a git commit.

**Signature**:
```typescript
git_commit(message: string, files?: string[]): ToolResult
```

**Parameters**:
- `message` (string, required): Commit message
- `files` (string[], optional): Files to stage and commit. Default: all staged files

**Behavior**:
1. Validates message is not empty
2. If files specified: stages them
3. Shows summary of what will be committed
4. Asks user for confirmation
5. Creates commit
6. Returns commit hash and summary

**Returns**:
```typescript
{
    success: true,
    output: {
        hash: string
        message: string
        files: string[]
        author: string
        timestamp: number
    }
}
```

**Examples**:

```typescript
// Commit already staged files
git_commit("feat: add user authentication")

// Stage and commit specific files
git_commit(
    "fix: resolve login timeout issue",
    ["src/auth/service.ts", "tests/auth.test.ts"]
)

// Multi-line commit message
git_commit(`feat: add password reset flow

- Add resetPassword method to AuthService
- Create password reset email template
- Add tests for reset flow
`)
```

**Confirmation Dialog**:
```
┌─── Commit ───────────────────────────┐
│ Message:                             │
│   feat: add user authentication      │
│                                      │
│ Files (3):                           │
│   - src/auth/service.ts              │
│   - src/auth/middleware.ts           │
│   - tests/auth.test.ts               │
│                                      │
│ [Y] Commit  [N] Cancel               │
└──────────────────────────────────────┘
```

**Example Output**:
```
Commit created: a1b2c3d
Author: User <user@example.com>
Date: 2025-12-01 15:30:45

feat: add user authentication

3 files changed, 127 insertions(+), 12 deletions(-)
```

**Use Cases**:
- Save progress
- Create checkpoint before refactoring
- Commit after implementing feature

**Error Cases**:
- Not a git repository
- No changes to commit
- Commit failed (hook rejection, etc.)
- Invalid file paths

---

## Run Tools

Tools for executing commands and tests.

### run_command

Execute shell commands with security validation.

**Signature**:
```typescript
run_command(command: string, timeout?: number): ToolResult
```

**Parameters**:
- `command` (string, required): Shell command to execute
- `timeout` (number, optional): Timeout in milliseconds (max 600000). Default: 30000

**Security**:
1. **Blacklist Check**: Dangerous commands always blocked
   - `rm -rf`, `sudo`, `git push --force`, etc.
2. **Whitelist Check**: Safe commands auto-approved
   - `npm`, `node`, `git status`, `tsc`, etc.
3. **Confirmation**: Unknown commands require user approval

**Returns**:
```typescript
{
    success: true,
    output: {
        stdout: string
        stderr: string
        exitCode: number
        duration: number
    }
}
```

**Examples**:

```typescript
// Run build (whitelisted)
run_command("npm run build")
// Auto-approved, executes immediately

// Run tests (whitelisted)
run_command("npm test")

// Custom command (requires confirmation)
run_command("node scripts/migrate.js")
// User must approve

// With timeout
run_command("npm run build", 120000)  // 2 minutes
```

**Blacklisted Commands** (always blocked):
```
rm -rf
rm -r
sudo
git push --force
git reset --hard
git clean -fd
npm publish
chmod
chown
```

**Whitelisted Commands** (auto-approved):
```
npm (all subcommands)
pnpm
yarn
node
npx
tsx
git (read-only: status, diff, log, show, branch)
tsc
vitest
jest
eslint
prettier
```

**Confirmation Dialog**:
```
┌─── Run Command ──────────────────────┐
│ Command: node scripts/migrate.js     │
│                                      │
│ This command is not whitelisted.     │
│ Do you want to allow it?             │
│                                      │
│ [Y] Allow  [N] Deny                  │
└──────────────────────────────────────┘
```

**Use Cases**:
- Run build/test commands
- Execute scripts
- Check command output
- Automate workflows

**Error Cases**:
- Command blacklisted (blocked)
- Command failed (non-zero exit)
- Timeout exceeded
- Permission denied

---

### run_tests

Run project tests with auto-detection of test runner.

**Signature**:
```typescript
run_tests(path?: string, filter?: string, watch?: boolean): ToolResult
```

**Parameters**:
- `path` (string, optional): Test file or directory. Default: all tests
- `filter` (string, optional): Test name pattern to match
- `watch` (boolean, optional): Run in watch mode. Default: false

**Test Runner Detection**:
1. Check for `vitest.config.ts` → use vitest
2. Check for `jest.config.js` → use jest
3. Check `package.json` devDependencies → vitest or jest
4. Check `package.json` scripts → npm test
5. Fallback: `npm test`

**Returns**:
```typescript
{
    success: true,
    output: {
        runner: "vitest" | "jest" | "mocha" | "npm"
        passed: boolean
        exitCode: number
        output: string
        stats?: {
            total: number
            passed: number
            failed: number
            skipped: number
        }
    }
}
```

**Examples**:

```typescript
// Run all tests
run_tests()
// Detects runner and executes

// Run specific test file
run_tests("tests/auth.test.ts")

// Run tests matching pattern
run_tests(null, "login")
// vitest: vitest -t "login"
// jest: jest --testNamePattern "login"

// Run in watch mode
run_tests(null, null, true)
// Background execution
```

**Example Output**:
```
Test runner: vitest
Running: vitest --run tests/auth.test.ts

 ✓ tests/auth.test.ts (5)
   ✓ login (3)
     ✓ should authenticate valid user
     ✓ should reject invalid password
     ✓ should handle missing user
   ✓ logout (2)
     ✓ should clear session
     ✓ should revoke token

Tests passed: 5/5
Duration: 234ms
```

**Use Cases**:
- Verify changes don't break tests
- Run specific test suites
- Check test coverage
- Continuous testing (watch mode)

**Error Cases**:
- No test runner detected
- Tests failed
- Invalid path
- Timeout

---

## Tool Confirmation

### Tools Requiring Confirmation

| Tool | When | Why |
|------|------|-----|
| `edit_lines` | Always | Modifies code |
| `create_file` | Always | Creates new file |
| `delete_file` | Always | Permanent deletion |
| `git_commit` | Always | Permanent action |
| `run_command` | Conditional | Unknown commands only |

### Confirmation Flow

```
1. Tool execution paused
2. ConfirmDialog shown to user
3. User chooses:
   - Apply/Yes: Continue execution
   - Cancel/No: Return error to LLM
   - Edit: Manual edit (future feature)
4. Result returned to LLM
5. LLM continues or adjusts based on result
```

### Auto-Apply Mode

Bypass confirmations with `--auto-apply`:

```bash
ipuaro --auto-apply
```

Or toggle in session:
```
/auto-apply on
```

**Warning**: Use with caution. The agent can make changes without approval.

---

## Error Handling

### Error Types

All tools return errors in standard format:

```typescript
{
    success: false,
    error: {
        type: "file" | "validation" | "parse" | "command" | "conflict" | "timeout",
        message: string,
        suggestion?: string,
        recoverable: boolean
    }
}
```

### Recoverable Errors

Errors the LLM can recover from:

- **File not found**: LLM can try different path
- **Parse error**: File has syntax errors, LLM can skip or fix
- **Validation error**: LLM can adjust parameters
- **Conflict**: File changed externally, LLM can regenerate
- **Command failed**: LLM can try alternative approach

### Non-Recoverable Errors

Errors that stop execution:

- **Redis unavailable**: Cannot continue without storage
- **Path outside project**: Security violation
- **Command blacklisted**: Security policy violation
- **Unknown error**: Unexpected failure

### Error Dialog

```
┌─── Error ────────────────────────────┐
│ Type: validation                     │
│ Message: Invalid line range 1-9999   │
│                                      │
│ Suggestion: Check file has 9999     │
│ lines. Use get_lines first.          │
│                                      │
│ [R] Retry  [S] Skip  [A] Abort       │
└──────────────────────────────────────┘
```

---

## Tool Tips

### Best Practices

1. **Read before edit**: Always use `get_lines` or `get_function` before `edit_lines`
2. **Check dependencies**: Use `get_dependents` before deleting files
3. **Verify impact**: Use `find_references` before refactoring functions
4. **Stage incrementally**: Commit related changes together
5. **Test after changes**: Use `run_tests` to verify changes don't break

### Common Patterns

**Refactoring Flow**:
```
1. find_references("oldFunction")
2. get_function("file.ts", "oldFunction")
3. edit_lines("file.ts", ...)  # Update implementation
4. For each reference:
   5. edit_lines(...)  # Update callers
6. run_tests()  # Verify
7. git_commit("refactor: update oldFunction")
```

**Bug Fix Flow**:
```
1. get_structure("src")  # Understand layout
2. find_definition("buggyFunction")
3. get_function("file.ts", "buggyFunction")
4. get_dependencies("file.ts")  # Check what it imports
5. edit_lines(...)  # Fix bug
6. run_tests("tests/bug.test.ts")
7. git_commit("fix: resolve issue #123")
```

**New Feature Flow**:
```
1. get_structure()  # Find where to add
2. create_file("src/new-feature.ts", ...)
3. edit_lines("src/index.ts", ...)  # Export new feature
4. create_file("tests/new-feature.test.ts", ...)
5. run_tests()
6. git_commit("feat: add new feature")
```

---

**Last Updated**: 2025-12-01
**Version**: 0.16.0
