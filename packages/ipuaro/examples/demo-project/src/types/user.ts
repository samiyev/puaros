/**
 * User-related type definitions
 */

export interface User {
    id: string
    email: string
    name: string
    role: UserRole
    createdAt: Date
    updatedAt: Date
}

export type UserRole = "admin" | "user" | "guest"

export interface CreateUserDto {
    email: string
    name: string
    password: string
    role?: UserRole
}

export interface UpdateUserDto {
    name?: string
    role?: UserRole
}

export interface AuthToken {
    token: string
    expiresAt: Date
    userId: string
}
