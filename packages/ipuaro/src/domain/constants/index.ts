// Domain Constants

export const MAX_UNDO_STACK_SIZE = 10

export const SUPPORTED_EXTENSIONS = [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
] as const

export const BINARY_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp3",
    ".mp4",
    ".webm",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
] as const

export const DEFAULT_IGNORE_PATTERNS = [
    "node_modules",
    "dist",
    "build",
    ".git",
    ".next",
    ".nuxt",
    "coverage",
    ".cache",
] as const

export const CONTEXT_WINDOW_SIZE = 128_000

export const CONTEXT_COMPRESSION_THRESHOLD = 0.8
