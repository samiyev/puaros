/**
 * Demo application entry point
 */

import { UserService } from "./services/user"
import { AuthService } from "./auth/service"
import { createLogger } from "./utils/logger"

const logger = createLogger("App")

async function main(): Promise<void> {
    logger.info("Starting demo application")

    // Initialize services
    const userService = new UserService()
    const authService = new AuthService(userService)

    try {
        // Create a demo user
        const user = await userService.createUser({
            email: "demo@example.com",
            name: "Demo User",
            password: "password123",
            role: "admin"
        })

        logger.info("Demo user created", { userId: user.id })

        // Login
        const token = await authService.login("demo@example.com", "password123")
        logger.info("Login successful", { token: token.token })

        // Verify token
        const verifiedUser = await authService.verifyToken(token.token)
        logger.info("Token verified", { userId: verifiedUser.id })

        // Logout
        await authService.logout(token.token)
        logger.info("Logout successful")
    } catch (error) {
        logger.error("Application error", error as Error)
        process.exit(1)
    }

    logger.info("Demo application finished")
}

main()
