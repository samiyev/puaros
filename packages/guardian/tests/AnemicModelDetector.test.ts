import { describe, it, expect, beforeEach } from "vitest"
import { AnemicModelDetector } from "../src/infrastructure/analyzers/AnemicModelDetector"

describe("AnemicModelDetector", () => {
    let detector: AnemicModelDetector

    beforeEach(() => {
        detector = new AnemicModelDetector()
    })

    describe("detectAnemicModels", () => {
        it("should detect class with only getters and setters", () => {
            const code = `
class Order {
    private status: string
    private total: number

    getStatus(): string {
        return this.status
    }

    setStatus(status: string): void {
        this.status = status
    }

    getTotal(): number {
        return this.total
    }

    setTotal(total: number): void {
        this.total = total
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Order.ts",
                "domain",
            )

            expect(violations).toHaveLength(1)
            expect(violations[0].className).toBe("Order")
            expect(violations[0].methodCount).toBeGreaterThan(0)
            expect(violations[0].propertyCount).toBeGreaterThan(0)
            expect(violations[0].getMessage()).toContain("Order")
        })

        it("should detect class with public setters", () => {
            const code = `
class User {
    private email: string
    private password: string

    public setEmail(email: string): void {
        this.email = email
    }

    public getEmail(): string {
        return this.email
    }

    public setPassword(password: string): void {
        this.password = password
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/User.ts",
                "domain",
            )

            expect(violations).toHaveLength(1)
            expect(violations[0].className).toBe("User")
            expect(violations[0].hasPublicSetters).toBe(true)
        })

        it("should not detect rich domain model with business logic", () => {
            const code = `
class Order {
    private readonly id: string
    private status: OrderStatus
    private items: OrderItem[]

    public approve(): void {
        if (!this.canBeApproved()) {
            throw new Error("Cannot approve")
        }
        this.status = OrderStatus.APPROVED
    }

    public reject(reason: string): void {
        if (!this.canBeRejected()) {
            throw new Error("Cannot reject")
        }
        this.status = OrderStatus.REJECTED
    }

    public addItem(item: OrderItem): void {
        if (this.isApproved()) {
            throw new Error("Cannot modify approved order")
        }
        this.items.push(item)
    }

    public calculateTotal(): Money {
        return this.items.reduce((sum, item) => sum.add(item.getPrice()), Money.zero())
    }

    public getStatus(): OrderStatus {
        return this.status
    }

    private canBeApproved(): boolean {
        return this.status === OrderStatus.PENDING
    }

    private canBeRejected(): boolean {
        return this.status === OrderStatus.PENDING
    }

    private isApproved(): boolean {
        return this.status === OrderStatus.APPROVED
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Order.ts",
                "domain",
            )

            expect(violations).toHaveLength(0)
        })

        it("should not analyze files outside domain layer", () => {
            const code = `
class OrderDto {
    getStatus(): string {
        return this.status
    }

    setStatus(status: string): void {
        this.status = status
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/application/dtos/OrderDto.ts",
                "application",
            )

            expect(violations).toHaveLength(0)
        })

        it("should not analyze DTO files", () => {
            const code = `
class UserDto {
    private email: string

    getEmail(): string {
        return this.email
    }

    setEmail(email: string): void {
        this.email = email
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/dtos/UserDto.ts",
                "domain",
            )

            expect(violations).toHaveLength(0)
        })

        it("should not analyze test files", () => {
            const code = `
class Order {
    getStatus(): string {
        return this.status
    }

    setStatus(status: string): void {
        this.status = status
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Order.test.ts",
                "domain",
            )

            expect(violations).toHaveLength(0)
        })

        it("should detect anemic model in entities folder", () => {
            const code = `
class Product {
    private name: string
    private price: number

    getName(): string {
        return this.name
    }

    setName(name: string): void {
        this.name = name
    }

    getPrice(): number {
        return this.price
    }

    setPrice(price: number): void {
        this.price = price
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Product.ts",
                "domain",
            )

            expect(violations).toHaveLength(1)
            expect(violations[0].className).toBe("Product")
        })

        it("should detect anemic model in aggregates folder", () => {
            const code = `
class Customer {
    private email: string

    getEmail(): string {
        return this.email
    }

    setEmail(email: string): void {
        this.email = email
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/aggregates/customer/Customer.ts",
                "domain",
            )

            expect(violations).toHaveLength(1)
            expect(violations[0].className).toBe("Customer")
        })

        it("should not detect class with good method-to-property ratio", () => {
            const code = `
class Account {
    private balance: number
    private isActive: boolean

    public deposit(amount: number): void {
        if (amount <= 0) throw new Error("Invalid amount")
        this.balance += amount
    }

    public withdraw(amount: number): void {
        if (amount > this.balance) throw new Error("Insufficient funds")
        this.balance -= amount
    }

    public activate(): void {
        this.isActive = true
    }

    public deactivate(): void {
        this.isActive = false
    }

    public getBalance(): number {
        return this.balance
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Account.ts",
                "domain",
            )

            expect(violations).toHaveLength(0)
        })

        it("should handle class with no properties or methods", () => {
            const code = `
class EmptyEntity {
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/EmptyEntity.ts",
                "domain",
            )

            expect(violations).toHaveLength(0)
        })

        it("should detect multiple anemic classes in one file", () => {
            const code = `
class Order {
    getStatus() { return this.status }
    setStatus(status: string) { this.status = status }
}

class Item {
    getPrice() { return this.price }
    setPrice(price: number) { this.price = price }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Models.ts",
                "domain",
            )

            expect(violations).toHaveLength(2)
            expect(violations[0].className).toBe("Order")
            expect(violations[1].className).toBe("Item")
        })

        it("should provide correct violation details", () => {
            const code = `
class Payment {
    private amount: number
    private currency: string

    getAmount(): number {
        return this.amount
    }

    setAmount(amount: number): void {
        this.amount = amount
    }

    getCurrency(): string {
        return this.currency
    }

    setCurrency(currency: string): void {
        this.currency = currency
    }
}
`
            const violations = detector.detectAnemicModels(
                code,
                "src/domain/entities/Payment.ts",
                "domain",
            )

            expect(violations).toHaveLength(1)
            const violation = violations[0]
            expect(violation.className).toBe("Payment")
            expect(violation.filePath).toBe("src/domain/entities/Payment.ts")
            expect(violation.layer).toBe("domain")
            expect(violation.line).toBeGreaterThan(0)
            expect(violation.getMessage()).toContain("Payment")
            expect(violation.getSuggestion()).toContain("business")
        })
    })
})
