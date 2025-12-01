/**
 * Authentication service
 */

import type { User, AuthToken } from "../types/user"
import { UserService } from "../services/user"
import { createLogger } from "../utils/logger"

const logger = createLogger("AuthService")

export class AuthService {
    private tokens: Map<string, AuthToken> = new Map()

    constructor(private userService: UserService) {}

    async login(email: string, password: string): Promise<AuthToken> {
        logger.info("Login attempt", { email })

        // Get user
        const user = await this.userService.getUserByEmail(email)
        if (!user) {
            logger.warn("Login failed - user not found", { email })
            throw new Error("Invalid credentials")
        }

        // TODO: Implement actual password verification
        // For demo purposes, we just check if password is provided
        if (!password) {
            logger.warn("Login failed - no password", { email })
            throw new Error("Invalid credentials")
        }

        // Generate token
        const token = this.generateToken(user)
        this.tokens.set(token.token, token)

        logger.info("Login successful", { userId: user.id })
        return token
    }

    async logout(tokenString: string): Promise<void> {
        logger.info("Logout", { token: tokenString.substring(0, 10) + "..." })

        const token = this.tokens.get(tokenString)
        if (!token) {
            throw new Error("Invalid token")
        }

        this.tokens.delete(tokenString)
        logger.info("Logout successful", { userId: token.userId })
    }

    async verifyToken(tokenString: string): Promise<User> {
        logger.debug("Verifying token")

        const token = this.tokens.get(tokenString)
        if (!token) {
            throw new Error("Invalid token")
        }

        if (token.expiresAt < new Date()) {
            this.tokens.delete(tokenString)
            throw new Error("Token expired")
        }

        const user = await this.userService.getUserById(token.userId)
        if (!user) {
            throw new Error("User not found")
        }

        return user
    }

    private generateToken(user: User): AuthToken {
        const token = `tok_${Date.now()}_${Math.random().toString(36).substring(7)}`
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours

        return {
            token,
            expiresAt,
            userId: user.id
        }
    }
}
