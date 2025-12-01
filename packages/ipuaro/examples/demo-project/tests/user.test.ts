/**
 * User service tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { UserService } from "../src/services/user"
import { ValidationError } from "../src/utils/validation"

describe("UserService", () => {
    let userService: UserService

    beforeEach(() => {
        userService = new UserService()
    })

    describe("createUser", () => {
        it("should create a new user", async () => {
            const user = await userService.createUser({
                email: "test@example.com",
                name: "Test User",
                password: "password123"
            })

            expect(user).toBeDefined()
            expect(user.email).toBe("test@example.com")
            expect(user.name).toBe("Test User")
            expect(user.role).toBe("user")
        })

        it("should reject invalid email", async () => {
            await expect(
                userService.createUser({
                    email: "invalid-email",
                    name: "Test User",
                    password: "password123"
                })
            ).rejects.toThrow(ValidationError)
        })

        it("should reject weak password", async () => {
            await expect(
                userService.createUser({
                    email: "test@example.com",
                    name: "Test User",
                    password: "weak"
                })
            ).rejects.toThrow(ValidationError)
        })

        it("should prevent duplicate emails", async () => {
            await userService.createUser({
                email: "test@example.com",
                name: "Test User",
                password: "password123"
            })

            await expect(
                userService.createUser({
                    email: "test@example.com",
                    name: "Another User",
                    password: "password123"
                })
            ).rejects.toThrow("already exists")
        })
    })

    describe("getUserById", () => {
        it("should return user by ID", async () => {
            const created = await userService.createUser({
                email: "test@example.com",
                name: "Test User",
                password: "password123"
            })

            const found = await userService.getUserById(created.id)
            expect(found).toEqual(created)
        })

        it("should return null for non-existent ID", async () => {
            const found = await userService.getUserById("non-existent")
            expect(found).toBeNull()
        })
    })

    describe("updateUser", () => {
        it("should update user name", async () => {
            const user = await userService.createUser({
                email: "test@example.com",
                name: "Test User",
                password: "password123"
            })

            const updated = await userService.updateUser(user.id, {
                name: "Updated Name"
            })

            expect(updated.name).toBe("Updated Name")
            expect(updated.email).toBe(user.email)
        })

        it("should throw error for non-existent user", async () => {
            await expect(
                userService.updateUser("non-existent", { name: "Test" })
            ).rejects.toThrow("not found")
        })
    })

    describe("deleteUser", () => {
        it("should delete user", async () => {
            const user = await userService.createUser({
                email: "test@example.com",
                name: "Test User",
                password: "password123"
            })

            await userService.deleteUser(user.id)

            const found = await userService.getUserById(user.id)
            expect(found).toBeNull()
        })
    })

    describe("listUsers", () => {
        it("should return all users", async () => {
            await userService.createUser({
                email: "user1@example.com",
                name: "User 1",
                password: "password123"
            })

            await userService.createUser({
                email: "user2@example.com",
                name: "User 2",
                password: "password123"
            })

            const users = await userService.listUsers()
            expect(users).toHaveLength(2)
        })
    })
})
