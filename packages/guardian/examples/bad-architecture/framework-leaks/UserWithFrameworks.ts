/**
 * BAD EXAMPLE: Framework Leaks in Domain Layer
 * This file should be in a domain layer structure to be detected
 */

import { PrismaClient } from "@prisma/client"
import { Request, Response } from "express"
import axios from "axios"

export class UserWithFrameworkLeaks {
    private prisma = new PrismaClient()

    async save(): Promise<void> {
        await this.prisma.user.create({
            data: { id: "1", email: "test@example.com" },
        })
    }

    async validateEmail(email: string): Promise<boolean> {
        const response = await axios.post("https://api.validator.com/email", { email })
        return response.data.valid
    }
}
