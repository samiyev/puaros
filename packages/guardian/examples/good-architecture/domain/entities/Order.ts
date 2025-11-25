/**
 * GOOD EXAMPLE: Rich Domain Model
 *
 * This Order class contains business logic and enforces business rules.
 * State changes are made through business methods, not setters.
 *
 * This follows Domain-Driven Design principles.
 */

type OrderStatus = "pending" | "approved" | "rejected" | "shipped"

interface OrderItem {
    productId: string
    quantity: number
    price: number
}

interface DomainEvent {
    type: string
    data: any
}

class Order {
    private readonly id: string
    private status: OrderStatus
    private items: OrderItem[]
    private readonly events: DomainEvent[] = []

    constructor(id: string, items: OrderItem[]) {
        this.id = id
        this.status = "pending"
        this.items = items
    }

    public approve(): void {
        if (!this.canBeApproved()) {
            throw new Error("Cannot approve order in current state")
        }
        this.status = "approved"
        this.events.push({
            type: "OrderApproved",
            data: { orderId: this.id },
        })
    }

    public reject(reason: string): void {
        if (!this.canBeRejected()) {
            throw new Error("Cannot reject order in current state")
        }
        this.status = "rejected"
        this.events.push({
            type: "OrderRejected",
            data: { orderId: this.id, reason },
        })
    }

    public ship(): void {
        if (!this.canBeShipped()) {
            throw new Error("Order must be approved before shipping")
        }
        this.status = "shipped"
        this.events.push({
            type: "OrderShipped",
            data: { orderId: this.id },
        })
    }

    public addItem(item: OrderItem): void {
        if (this.status !== "pending") {
            throw new Error("Cannot modify approved or shipped order")
        }
        this.items.push(item)
    }

    public calculateTotal(): number {
        return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }

    public getStatus(): OrderStatus {
        return this.status
    }

    public getItems(): OrderItem[] {
        return [...this.items]
    }

    public getEvents(): DomainEvent[] {
        return [...this.events]
    }

    private canBeApproved(): boolean {
        return this.status === "pending" && this.items.length > 0
    }

    private canBeRejected(): boolean {
        return this.status === "pending"
    }

    private canBeShipped(): boolean {
        return this.status === "approved"
    }
}

export { Order }
