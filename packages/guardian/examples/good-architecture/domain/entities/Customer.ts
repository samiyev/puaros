/**
 * GOOD EXAMPLE: Rich Domain Model with Business Logic
 *
 * This Customer class encapsulates business rules and state transitions.
 * No public setters - all changes go through business methods.
 *
 * This follows Domain-Driven Design and encapsulation principles.
 */

interface Address {
    street: string
    city: string
    country: string
    postalCode: string
}

interface DomainEvent {
    type: string
    data: any
}

class Customer {
    private readonly id: string
    private email: string
    private isActive: boolean
    private loyaltyPoints: number
    private address: Address | null
    private readonly events: DomainEvent[] = []

    constructor(id: string, email: string) {
        this.id = id
        this.email = email
        this.isActive = true
        this.loyaltyPoints = 0
        this.address = null
    }

    public activate(): void {
        if (this.isActive) {
            throw new Error("Customer is already active")
        }
        this.isActive = true
        this.events.push({
            type: "CustomerActivated",
            data: { customerId: this.id },
        })
    }

    public deactivate(reason: string): void {
        if (!this.isActive) {
            throw new Error("Customer is already inactive")
        }
        this.isActive = false
        this.events.push({
            type: "CustomerDeactivated",
            data: { customerId: this.id, reason },
        })
    }

    public changeEmail(newEmail: string): void {
        if (!this.isValidEmail(newEmail)) {
            throw new Error("Invalid email format")
        }
        if (this.email === newEmail) {
            return
        }
        const oldEmail = this.email
        this.email = newEmail
        this.events.push({
            type: "EmailChanged",
            data: { customerId: this.id, oldEmail, newEmail },
        })
    }

    public updateAddress(address: Address): void {
        if (!this.isValidAddress(address)) {
            throw new Error("Invalid address")
        }
        this.address = address
        this.events.push({
            type: "AddressUpdated",
            data: { customerId: this.id },
        })
    }

    public addLoyaltyPoints(points: number): void {
        if (points <= 0) {
            throw new Error("Points must be positive")
        }
        if (!this.isActive) {
            throw new Error("Cannot add points to inactive customer")
        }
        this.loyaltyPoints += points
        this.events.push({
            type: "LoyaltyPointsAdded",
            data: { customerId: this.id, points },
        })
    }

    public redeemLoyaltyPoints(points: number): void {
        if (points <= 0) {
            throw new Error("Points must be positive")
        }
        if (this.loyaltyPoints < points) {
            throw new Error("Insufficient loyalty points")
        }
        this.loyaltyPoints -= points
        this.events.push({
            type: "LoyaltyPointsRedeemed",
            data: { customerId: this.id, points },
        })
    }

    public getEmail(): string {
        return this.email
    }

    public getLoyaltyPoints(): number {
        return this.loyaltyPoints
    }

    public getAddress(): Address | null {
        return this.address ? { ...this.address } : null
    }

    public getEvents(): DomainEvent[] {
        return [...this.events]
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    private isValidAddress(address: Address): boolean {
        return !!address.street && !!address.city && !!address.country && !!address.postalCode
    }
}

export { Customer }
