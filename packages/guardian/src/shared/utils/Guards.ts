import { TYPE_NAMES } from "../constants"

/**
 * Type guard utilities for runtime type checking
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Guards {
    public static isNullOrUndefined(value: unknown): value is null | undefined {
        return value === null || value === undefined
    }

    public static isString(value: unknown): value is string {
        return typeof value === TYPE_NAMES.STRING
    }

    public static isNumber(value: unknown): value is number {
        return typeof value === TYPE_NAMES.NUMBER && !isNaN(value as number)
    }

    public static isBoolean(value: unknown): value is boolean {
        return typeof value === TYPE_NAMES.BOOLEAN
    }

    public static isObject(value: unknown): value is object {
        return typeof value === TYPE_NAMES.OBJECT && value !== null && !Array.isArray(value)
    }

    public static isArray<T>(value: unknown): value is T[] {
        return Array.isArray(value)
    }

    public static isEmpty(value: string | unknown[] | object | null | undefined): boolean {
        if (Guards.isNullOrUndefined(value)) {
            return true
        }

        if (Guards.isString(value) || Guards.isArray(value)) {
            return value.length === 0
        }

        if (Guards.isObject(value)) {
            return Object.keys(value).length === 0
        }

        return false
    }
}
