/**
 * User service - handles user-related operations
 */

import type { User, CreateUserDto, UpdateUserDto } from "../types/user"
import { isValidEmail, isStrongPassword, ValidationError } from "../utils/validation"
import { createLogger } from "../utils/logger"

const logger = createLogger("UserService")

export class UserService {
    private users: Map<string, User> = new Map()

    async createUser(dto: CreateUserDto): Promise<User> {
        logger.info("Creating user", { email: dto.email })

        // Validate email
        if (!isValidEmail(dto.email)) {
            throw new ValidationError("Invalid email address", "email")
        }

        // Validate password
        if (!isStrongPassword(dto.password)) {
            throw new ValidationError("Password must be at least 8 characters", "password")
        }

        // Check if user already exists
        const existingUser = Array.from(this.users.values()).find(
            (u) => u.email === dto.email
        )

        if (existingUser) {
            throw new Error("User with this email already exists")
        }

        // Create user
        const user: User = {
            id: this.generateId(),
            email: dto.email,
            name: dto.name,
            role: dto.role || "user",
            createdAt: new Date(),
            updatedAt: new Date()
        }

        this.users.set(user.id, user)
        logger.info("User created", { userId: user.id })

        return user
    }

    async getUserById(id: string): Promise<User | null> {
        logger.debug("Getting user by ID", { userId: id })
        return this.users.get(id) || null
    }

    async getUserByEmail(email: string): Promise<User | null> {
        logger.debug("Getting user by email", { email })
        return Array.from(this.users.values()).find((u) => u.email === email) || null
    }

    async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
        logger.info("Updating user", { userId: id })

        const user = this.users.get(id)
        if (!user) {
            throw new Error("User not found")
        }

        const updated: User = {
            ...user,
            ...(dto.name && { name: dto.name }),
            ...(dto.role && { role: dto.role }),
            updatedAt: new Date()
        }

        this.users.set(id, updated)
        logger.info("User updated", { userId: id })

        return updated
    }

    async deleteUser(id: string): Promise<void> {
        logger.info("Deleting user", { userId: id })

        if (!this.users.has(id)) {
            throw new Error("User not found")
        }

        this.users.delete(id)
        logger.info("User deleted", { userId: id })
    }

    async listUsers(): Promise<User[]> {
        logger.debug("Listing all users")
        return Array.from(this.users.values())
    }

    private generateId(): string {
        return `user_${Date.now()}_${Math.random().toString(36).substring(7)}`
    }
}
