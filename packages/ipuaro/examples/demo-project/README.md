# ipuaro Demo Project

This is a demo project showcasing ipuaro's capabilities as a local AI agent for codebase operations.

## Project Overview

A simple TypeScript application demonstrating:
- User management service
- Authentication service
- Validation utilities
- Logging utilities
- Unit tests

The code intentionally includes various patterns (TODOs, FIXMEs, complex functions, dependencies) to demonstrate ipuaro's analysis tools.

## Setup

### Prerequisites

1. **Redis** - Running locally
```bash
# macOS
brew install redis
redis-server --appendonly yes
```

2. **Ollama** - With qwen2.5-coder model
```bash
brew install ollama
ollama serve
ollama pull qwen2.5-coder:7b-instruct
```

3. **Node.js** - v20 or higher

### Installation

```bash
# Install dependencies
npm install

# Or with pnpm
pnpm install
```

## Using ipuaro with Demo Project

### Start ipuaro

```bash
# From this directory
npx @samiyev/ipuaro

# Or if installed globally
ipuaro
```

### Example Queries

Try these queries to explore ipuaro's capabilities:

#### 1. Understanding the Codebase

```
You: What is the structure of this project?
```

ipuaro will use `get_structure` to show the directory tree.

```
You: How does user creation work?
```

ipuaro will:
1. Use `get_structure` to find relevant files
2. Use `get_function` to read the `createUser` function
3. Use `find_references` to see where it's called
4. Explain the flow

#### 2. Finding Issues

```
You: What TODOs and FIXMEs are in the codebase?
```

ipuaro will use `get_todos` to list all TODO/FIXME comments.

```
You: Which files are most complex?
```

ipuaro will use `get_complexity` to analyze and rank files by complexity.

#### 3. Understanding Dependencies

```
You: What does the UserService depend on?
```

ipuaro will use `get_dependencies` to show imported modules.

```
You: What files use the validation utilities?
```

ipuaro will use `get_dependents` to show files importing validation.ts.

#### 4. Code Analysis

```
You: Find all references to the ValidationError class
```

ipuaro will use `find_references` to locate all usages.

```
You: Where is the Logger class defined?
```

ipuaro will use `find_definition` to locate the definition.

#### 5. Making Changes

```
You: Add a method to UserService to count total users
```

ipuaro will:
1. Read UserService class with `get_class`
2. Generate the new method
3. Use `edit_lines` to add it
4. Show diff and ask for confirmation

```
You: Fix the TODO in validation.ts about password validation
```

ipuaro will:
1. Find the TODO with `get_todos`
2. Read the function with `get_function`
3. Implement stronger password validation
4. Use `edit_lines` to apply changes

#### 6. Testing

```
You: Run the tests
```

ipuaro will use `run_tests` to execute the test suite.

```
You: Add a test for the getUserByEmail method
```

ipuaro will:
1. Read existing tests with `get_lines`
2. Generate new test following the pattern
3. Use `edit_lines` to add it

#### 7. Git Operations

```
You: What files have I changed?
```

ipuaro will use `git_status` to show modified files.

```
You: Show me the diff for UserService
```

ipuaro will use `git_diff` with the file path.

```
You: Commit these changes with message "feat: add user count method"
```

ipuaro will use `git_commit` after confirmation.

## Tool Demonstration Scenarios

### Scenario 1: Bug Fix Flow

```
You: There's a bug - we need to sanitize user input before storing. Fix this in UserService.

Agent will:
1. get_function("src/services/user.ts", "createUser")
2. See that sanitization is missing
3. find_definition("sanitizeInput") to locate the utility
4. edit_lines to add sanitization call
5. run_tests to verify the fix
```

### Scenario 2: Refactoring Flow

```
You: Extract the ID generation logic into a separate utility function

Agent will:
1. get_class("src/services/user.ts", "UserService")
2. Find generateId private method
3. create_file("src/utils/id.ts") with the utility
4. edit_lines to replace private method with import
5. find_references("generateId") to check no other usages
6. run_tests to ensure nothing broke
```

### Scenario 3: Feature Addition

```
You: Add password reset functionality to AuthService

Agent will:
1. get_class("src/auth/service.ts", "AuthService")
2. get_dependencies to see what's available
3. Design the resetPassword method
4. edit_lines to add the method
5. Suggest creating a test
6. create_file("tests/auth.test.ts") if needed
```

### Scenario 4: Code Review

```
You: Review the code for security issues

Agent will:
1. get_todos to find FIXME about XSS
2. get_complexity to find complex functions
3. get_function for suspicious functions
4. Suggest improvements
5. Optionally edit_lines to fix issues
```

## Slash Commands

While exploring, you can use these commands:

```
/help               # Show all commands and hotkeys
/status             # Show system status (LLM, Redis, context)
/sessions list      # List all sessions
/undo               # Undo last file change
/clear              # Clear chat history
/reindex            # Force project reindexation
/auto-apply on      # Enable auto-apply mode (skip confirmations)
```

## Hotkeys

- `Ctrl+C` - Interrupt generation (1st) / Exit (2nd within 1s)
- `Ctrl+D` - Exit and save session
- `Ctrl+Z` - Undo last change
- `↑` / `↓` - Navigate input history

## Project Files Overview

```
demo-project/
├── src/
│   ├── auth/
│   │   └── service.ts       # Authentication logic (login, logout, verify)
│   ├── services/
│   │   └── user.ts          # User CRUD operations
│   ├── utils/
│   │   ├── logger.ts        # Logging utility (multiple methods)
│   │   └── validation.ts    # Input validation (with TODOs/FIXMEs)
│   ├── types/
│   │   └── user.ts          # TypeScript type definitions
│   └── index.ts             # Application entry point
├── tests/
│   └── user.test.ts         # User service tests (vitest)
├── package.json             # Project configuration
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Test configuration
└── .ipuaro.json             # ipuaro configuration
```

## What ipuaro Can Do With This Project

### Read Tools ✅
- **get_lines**: Read any file or specific line ranges
- **get_function**: Extract specific functions (login, createUser, etc.)
- **get_class**: Extract classes (UserService, AuthService, Logger, etc.)
- **get_structure**: See directory tree

### Edit Tools ✅
- **edit_lines**: Modify functions, fix bugs, add features
- **create_file**: Add new utilities, tests, services
- **delete_file**: Remove unused files

### Search Tools ✅
- **find_references**: Find all usages of ValidationError, User, etc.
- **find_definition**: Locate where Logger, UserService are defined

### Analysis Tools ✅
- **get_dependencies**: See what UserService imports
- **get_dependents**: See what imports validation.ts (multiple files!)
- **get_complexity**: Identify complex functions (createUser has moderate complexity)
- **get_todos**: Find 2 TODOs and 1 FIXME in the project

### Git Tools ✅
- **git_status**: Check working tree
- **git_diff**: See changes
- **git_commit**: Commit with AI-generated messages

### Run Tools ✅
- **run_command**: Execute npm scripts
- **run_tests**: Run vitest tests

## Tips for Best Experience

1. **Start Small**: Ask about structure first, then dive into specific files
2. **Be Specific**: "Show me the createUser function" vs "How does this work?"
3. **Use Tools Implicitly**: Just ask questions, let ipuaro choose the right tools
4. **Review Changes**: Always review diffs before applying edits
5. **Test Often**: Ask ipuaro to run tests after making changes
6. **Commit Incrementally**: Use git_commit for each logical change

## Advanced Workflows

### Workflow 1: Add New Feature

```
You: Add email verification to the authentication flow

Agent will:
1. Analyze current auth flow
2. Propose design (new fields, methods)
3. Edit AuthService to add verification
4. Edit User types to add verified field
5. Create tests for verification
6. Run tests
7. Offer to commit
```

### Workflow 2: Performance Optimization

```
You: The user lookup is slow when we have many users. Optimize it.

Agent will:
1. Analyze UserService.getUserByEmail
2. See it's using Array.find (O(n))
3. Suggest adding an email index
4. Edit to add private emailIndex: Map<string, User>
5. Update createUser to populate index
6. Update deleteUser to maintain index
7. Run tests to verify
```

### Workflow 3: Security Audit

```
You: Audit the code for security vulnerabilities

Agent will:
1. get_todos to find FIXME about XSS
2. Review sanitizeInput implementation
3. Check password validation strength
4. Look for SQL injection risks (none here)
5. Suggest improvements
6. Optionally implement fixes
```

## Next Steps

After exploring the demo project, try:

1. **Your Own Project**: Run `ipuaro` in your real codebase
2. **Customize Config**: Edit `.ipuaro.json` to fit your needs
3. **Different Model**: Try `--model qwen2.5-coder:32b-instruct` for better results
4. **Auto-Apply Mode**: Use `--auto-apply` for faster iterations (with caution!)

## Troubleshooting

### Redis Not Connected
```bash
# Start Redis with persistence
redis-server --appendonly yes
```

### Ollama Model Not Found
```bash
# Pull the model
ollama pull qwen2.5-coder:7b-instruct

# Check it's installed
ollama list
```

### Indexing Takes Long
The project is small (~10 files) so indexing should be instant. For larger projects, use ignore patterns in `.ipuaro.json`.

## Learn More

- [ipuaro Documentation](../../README.md)
- [Architecture Guide](../../ARCHITECTURE.md)
- [Tools Reference](../../TOOLS.md)
- [GitHub Repository](https://github.com/samiyev/puaros)

---

**Happy coding with ipuaro!** 🎩✨
