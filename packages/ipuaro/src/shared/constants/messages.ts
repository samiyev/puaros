/**
 * User-facing messages and labels.
 */

export const MESSAGES = {
    // Status messages
    STATUS_READY: "Ready",
    STATUS_THINKING: "Thinking...",
    STATUS_INDEXING: "Indexing...",
    STATUS_ERROR: "Error",

    // Error messages
    ERROR_REDIS_UNAVAILABLE: "Redis is not available. Please start Redis server.",
    ERROR_OLLAMA_UNAVAILABLE: "Ollama is not available. Please start Ollama.",
    ERROR_MODEL_NOT_FOUND: "Model not found. Would you like to pull it?",
    ERROR_FILE_NOT_FOUND: "File not found",
    ERROR_PARSE_FAILED: "Failed to parse file",
    ERROR_TOOL_FAILED: "Tool execution failed",
    ERROR_COMMAND_BLACKLISTED: "Command is blacklisted for security reasons",
    ERROR_PATH_OUTSIDE_PROJECT: "Path is outside project directory",

    // Confirmation messages
    CONFIRM_APPLY_EDIT: "Apply this edit?",
    CONFIRM_DELETE_FILE: "Delete this file?",
    CONFIRM_RUN_COMMAND: "Run this command?",
    CONFIRM_CREATE_FILE: "Create this file?",
    CONFIRM_GIT_COMMIT: "Create this commit?",

    // Info messages
    INFO_SESSION_LOADED: "Session loaded",
    INFO_SESSION_CREATED: "New session created",
    INFO_INDEXING_COMPLETE: "Indexing complete",
    INFO_EDIT_APPLIED: "Edit applied",
    INFO_EDIT_CANCELLED: "Edit cancelled",
    INFO_UNDO_SUCCESS: "Change reverted",
    INFO_UNDO_EMPTY: "Nothing to undo",

    // Help text
    HELP_COMMANDS: `Available commands:
  /help       - Show this help
  /clear      - Clear chat history
  /undo       - Revert last file change
  /sessions   - Manage sessions
  /status     - Show status info
  /reindex    - Force reindexing
  /auto-apply - Toggle auto-apply mode`,

    HELP_HOTKEYS: `Hotkeys:
  Ctrl+C  - Interrupt / Exit
  Ctrl+D  - Exit with save
  Ctrl+Z  - Undo last change
  ↑/↓     - Navigate history
  Tab     - Autocomplete paths`,
} as const

export type MessageKey = keyof typeof MESSAGES
