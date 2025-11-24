/**
 * BAD EXAMPLE: Framework Leak in Domain Layer
 *
 * This file violates Clean Architecture by importing framework-specific packages
 * directly into the domain layer, creating tight coupling.
 *
 * Issues:
 * 1. Direct Prisma dependency in domain (ORM leak)
 * 2. Express types in domain (web framework leak)
 * 3. Axios in domain (HTTP client leak)
 *
 * Fix: Use interfaces in domain, implement in infrastructure
 */

import { PrismaClient } from "@prisma/client"
import { Request, Response } from "express"
import axios from "axios"

// ❌ Bad: Domain entity with database dependency
export class UserWithPrisma {
    private prisma = new PrismaClient()

    constructor(
        private id: string,
        private email: string,
    ) {}

    async save(): Promise<void> {
        await this.prisma.user.create({
            data: { id: this.id, email: this.email },
        })
    }

    async find(id: string): Promise<UserWithPrisma | null> {
        const user = await this.prisma.user.findUnique({ where: { id } })
        return user ? new UserWithPrisma(user.id, user.email) : null
    }
}

// ❌ Bad: Domain service with HTTP dependency
export class UserServiceWithAxios {
    async validateEmail(email: string): Promise<boolean> {
        const response = await axios.post("https://api.validator.com/email", { email })
        return response.data.valid
    }
}

// ❌ Bad: Domain value object with web framework dependency
export class EmailRequest {
    constructor(
        public req: Request,
        public res: Response,
    ) {}

    getEmail(): string {
        return this.req.body.email
    }
}
