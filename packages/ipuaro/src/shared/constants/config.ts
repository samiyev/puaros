import { z } from "zod"

/**
 * Redis configuration schema.
 */
export const RedisConfigSchema = z.object({
    host: z.string().default("localhost"),
    port: z.number().int().positive().default(6379),
    db: z.number().int().min(0).max(15).default(0),
    password: z.string().optional(),
    keyPrefix: z.string().default("ipuaro:"),
})

/**
 * LLM configuration schema.
 */
export const LLMConfigSchema = z.object({
    model: z.string().default("qwen2.5-coder:7b-instruct"),
    contextWindow: z.number().int().positive().default(128_000),
    temperature: z.number().min(0).max(2).default(0.1),
    host: z.string().default("http://localhost:11434"),
    timeout: z.number().int().positive().default(120_000),
})

/**
 * Project configuration schema.
 */
export const ProjectConfigSchema = z.object({
    ignorePatterns: z
        .array(z.string())
        .default(["node_modules", "dist", "build", ".git", ".next", ".nuxt", "coverage", ".cache"]),
    binaryExtensions: z
        .array(z.string())
        .default([
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
        ]),
    maxFileSize: z.number().int().positive().default(1_000_000),
    supportedExtensions: z
        .array(z.string())
        .default([".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml"]),
})

/**
 * Watchdog configuration schema.
 */
export const WatchdogConfigSchema = z.object({
    enabled: z.boolean().default(true),
    debounceMs: z.number().int().positive().default(500),
})

/**
 * Undo configuration schema.
 */
export const UndoConfigSchema = z.object({
    stackSize: z.number().int().positive().default(10),
})

/**
 * Edit configuration schema.
 */
export const EditConfigSchema = z.object({
    autoApply: z.boolean().default(false),
    syntaxHighlight: z.boolean().default(true),
})

/**
 * Input configuration schema.
 */
export const InputConfigSchema = z.object({
    multiline: z.union([z.boolean(), z.literal("auto")]).default(false),
})

/**
 * Display configuration schema.
 */
export const DisplayConfigSchema = z.object({
    showStats: z.boolean().default(true),
    showToolCalls: z.boolean().default(true),
    theme: z.enum(["dark", "light"]).default("dark"),
    bellOnComplete: z.boolean().default(false),
    progressBar: z.boolean().default(true),
})

/**
 * Session configuration schema.
 */
export const SessionConfigSchema = z.object({
    persistIndefinitely: z.boolean().default(true),
    maxHistoryMessages: z.number().int().positive().default(100),
    saveInputHistory: z.boolean().default(true),
})

/**
 * Context configuration schema.
 */
export const ContextConfigSchema = z.object({
    systemPromptTokens: z.number().int().positive().default(2000),
    maxContextUsage: z.number().min(0).max(1).default(0.8),
    autoCompressAt: z.number().min(0).max(1).default(0.8),
    compressionMethod: z.enum(["llm-summary", "truncate"]).default("llm-summary"),
    includeSignatures: z.boolean().default(true),
    includeDepsGraph: z.boolean().default(true),
})

/**
 * Autocomplete configuration schema.
 */
export const AutocompleteConfigSchema = z.object({
    enabled: z.boolean().default(true),
    source: z.enum(["redis-index", "filesystem", "both"]).default("redis-index"),
    maxSuggestions: z.number().int().positive().default(10),
})

/**
 * Commands configuration schema.
 */
export const CommandsConfigSchema = z.object({
    timeout: z.number().int().positive().nullable().default(null),
})

/**
 * Full configuration schema.
 */
export const ConfigSchema = z.object({
    redis: RedisConfigSchema.default({}),
    llm: LLMConfigSchema.default({}),
    project: ProjectConfigSchema.default({}),
    watchdog: WatchdogConfigSchema.default({}),
    undo: UndoConfigSchema.default({}),
    edit: EditConfigSchema.default({}),
    input: InputConfigSchema.default({}),
    display: DisplayConfigSchema.default({}),
    session: SessionConfigSchema.default({}),
    context: ContextConfigSchema.default({}),
    autocomplete: AutocompleteConfigSchema.default({}),
    commands: CommandsConfigSchema.default({}),
})

/**
 * Configuration type inferred from schema.
 */
export type Config = z.infer<typeof ConfigSchema>
export type RedisConfig = z.infer<typeof RedisConfigSchema>
export type LLMConfig = z.infer<typeof LLMConfigSchema>
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>
export type WatchdogConfig = z.infer<typeof WatchdogConfigSchema>
export type UndoConfig = z.infer<typeof UndoConfigSchema>
export type EditConfig = z.infer<typeof EditConfigSchema>
export type InputConfig = z.infer<typeof InputConfigSchema>
export type DisplayConfig = z.infer<typeof DisplayConfigSchema>
export type SessionConfig = z.infer<typeof SessionConfigSchema>
export type ContextConfig = z.infer<typeof ContextConfigSchema>
export type AutocompleteConfig = z.infer<typeof AutocompleteConfigSchema>
export type CommandsConfig = z.infer<typeof CommandsConfigSchema>

/**
 * Default configuration.
 */
export const DEFAULT_CONFIG: Config = ConfigSchema.parse({})
