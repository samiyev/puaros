/**
 * BAD EXAMPLE: Anemic Domain Model with Public Setters
 *
 * This User class has public setters which is an anti-pattern in DDD.
 * Public setters allow uncontrolled state changes without validation or business rules.
 *
 * This violates Domain-Driven Design principles and encapsulation.
 */

class User {
    private email: string
    private password: string
    private status: string

    public setEmail(email: string): void {
        this.email = email
    }

    public getEmail(): string {
        return this.email
    }

    public setPassword(password: string): void {
        this.password = password
    }

    public setStatus(status: string): void {
        this.status = status
    }

    public getStatus(): string {
        return this.status
    }
}
