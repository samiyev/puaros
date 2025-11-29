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

/**
 * Default configuration.
 */
export const DEFAULT_CONFIG: Config = ConfigSchema.parse({})
