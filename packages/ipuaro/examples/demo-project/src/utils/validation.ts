/**
 * Validation utilities
 */

export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

export function isStrongPassword(password: string): boolean {
    // TODO: Add more sophisticated password validation
    return password.length >= 8
}

export function sanitizeInput(input: string): string {
    // FIXME: This is a basic implementation, needs XSS protection
    return input.trim().replace(/[<>]/g, "")
}

export class ValidationError extends Error {
    constructor(
        message: string,
        public field: string
    ) {
        super(message)
        this.name = "ValidationError"
    }
}
