/**
 * BAD EXAMPLE: Anemic Domain Model
 *
 * This Order class only has getters and setters without any business logic.
 * All business logic is likely scattered in services (procedural approach).
 *
 * This violates Domain-Driven Design principles.
 */

class Order {
    private status: string
    private total: number
    private items: any[]

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

    getItems(): any[] {
        return this.items
    }

    setItems(items: any[]): void {
        this.items = items
    }
}
