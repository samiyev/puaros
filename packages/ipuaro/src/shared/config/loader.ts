import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { Config, ConfigSchema, DEFAULT_CONFIG } from "../constants/config.js"

const CONFIG_FILE_NAME = ".ipuaro.json"
const DEFAULT_CONFIG_PATH = "config/default.json"

/**
 * Load configuration from files.
 * Priority: .ipuaro.json > config/default.json > defaults
 */
export function loadConfig(projectRoot: string): Config {
    const configs: Partial<Config>[] = []

    const defaultConfigPath = join(projectRoot, DEFAULT_CONFIG_PATH)
    if (existsSync(defaultConfigPath)) {
        try {
            const content = readFileSync(defaultConfigPath, "utf-8")
            configs.push(JSON.parse(content) as Partial<Config>)
        } catch {
            // Ignore parse errors for default config
        }
    }

    const projectConfigPath = join(projectRoot, CONFIG_FILE_NAME)
    if (existsSync(projectConfigPath)) {
        try {
            const content = readFileSync(projectConfigPath, "utf-8")
            configs.push(JSON.parse(content) as Partial<Config>)
        } catch {
            // Ignore parse errors for project config
        }
    }

    if (configs.length === 0) {
        return DEFAULT_CONFIG
    }

    const merged = deepMerge(DEFAULT_CONFIG, ...configs)
    return ConfigSchema.parse(merged)
}

/**
 * Deep merge objects.
 */
function deepMerge<T extends Record<string, unknown>>(target: T, ...sources: Partial<T>[]): T {
    const result = { ...target }

    for (const source of sources) {
        for (const key in source) {
            const sourceValue = source[key]
            const targetValue = result[key]

            if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
                result[key] = deepMerge(
                    targetValue as Record<string, unknown>,
                    sourceValue as Record<string, unknown>,
                ) as T[Extract<keyof T, string>]
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue as T[Extract<keyof T, string>]
            }
        }
    }

    return result
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Validate configuration.
 */
export function validateConfig(config: unknown): config is Config {
    const result = ConfigSchema.safeParse(config)
    return result.success
}

/**
 * Get config validation errors.
 */
export function getConfigErrors(config: unknown): string[] {
    const result = ConfigSchema.safeParse(config)
    if (result.success) {
        return []
    }
    return result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
}
