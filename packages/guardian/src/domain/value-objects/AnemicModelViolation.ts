import { ValueObject } from "./ValueObject"
import { ANEMIC_MODEL_MESSAGES } from "../constants/Messages"
import { EXAMPLE_CODE_CONSTANTS } from "../../shared/constants"

interface AnemicModelViolationProps {
    readonly className: string
    readonly filePath: string
    readonly layer: string
    readonly line?: number
    readonly methodCount: number
    readonly propertyCount: number
    readonly hasOnlyGettersSetters: boolean
    readonly hasPublicSetters: boolean
}

/**
 * Represents an anemic domain model violation in the codebase
 *
 * Anemic domain model occurs when entities have only getters/setters
 * without business logic. This violates Domain-Driven Design principles
 * and leads to procedural code instead of object-oriented design.
 *
 * @example
 * ```typescript
 * // Bad: Anemic model with only getters/setters
 * const violation = AnemicModelViolation.create(
 *     'Order',
 *     'src/domain/entities/Order.ts',
 *     'domain',
 *     10,
 *     4,
 *     2,
 *     true,
 *     true
 * )
 *
 * console.log(violation.getMessage())
 * // "Class 'Order' is anemic: 4 methods (all getters/setters) for 2 properties"
 * ```
 */
export class AnemicModelViolation extends ValueObject<AnemicModelViolationProps> {
    private constructor(props: AnemicModelViolationProps) {
        super(props)
    }

    public static create(
        className: string,
        filePath: string,
        layer: string,
        line: number | undefined,
        methodCount: number,
        propertyCount: number,
        hasOnlyGettersSetters: boolean,
        hasPublicSetters: boolean,
    ): AnemicModelViolation {
        return new AnemicModelViolation({
            className,
            filePath,
            layer,
            line,
            methodCount,
            propertyCount,
            hasOnlyGettersSetters,
            hasPublicSetters,
        })
    }

    public get className(): string {
        return this.props.className
    }

    public get filePath(): string {
        return this.props.filePath
    }

    public get layer(): string {
        return this.props.layer
    }

    public get line(): number | undefined {
        return this.props.line
    }

    public get methodCount(): number {
        return this.props.methodCount
    }

    public get propertyCount(): number {
        return this.props.propertyCount
    }

    public get hasOnlyGettersSetters(): boolean {
        return this.props.hasOnlyGettersSetters
    }

    public get hasPublicSetters(): boolean {
        return this.props.hasPublicSetters
    }

    public getMessage(): string {
        if (this.props.hasPublicSetters) {
            return `Class '${this.props.className}' has public setters (anti-pattern in DDD)`
        }

        if (this.props.hasOnlyGettersSetters) {
            return `Class '${this.props.className}' is anemic: ${String(this.props.methodCount)} methods (all getters/setters) for ${String(this.props.propertyCount)} properties`
        }

        const ratio = this.props.methodCount / Math.max(this.props.propertyCount, 1)
        return `Class '${this.props.className}' appears anemic: low method-to-property ratio (${ratio.toFixed(1)}:1)`
    }

    public getSuggestion(): string {
        const suggestions: string[] = []

        if (this.props.hasPublicSetters) {
            suggestions.push(ANEMIC_MODEL_MESSAGES.REMOVE_PUBLIC_SETTERS)
            suggestions.push(ANEMIC_MODEL_MESSAGES.USE_METHODS_FOR_CHANGES)
            suggestions.push(ANEMIC_MODEL_MESSAGES.ENCAPSULATE_INVARIANTS)
        }

        if (this.props.hasOnlyGettersSetters || this.props.methodCount < 2) {
            suggestions.push(ANEMIC_MODEL_MESSAGES.ADD_BUSINESS_METHODS)
            suggestions.push(ANEMIC_MODEL_MESSAGES.MOVE_LOGIC_FROM_SERVICES)
            suggestions.push(ANEMIC_MODEL_MESSAGES.ENCAPSULATE_BUSINESS_RULES)
            suggestions.push(ANEMIC_MODEL_MESSAGES.USE_DOMAIN_EVENTS)
        }

        return suggestions.join("\n")
    }

    public getExampleFix(): string {
        if (this.props.hasPublicSetters) {
            return `
// ❌ Bad: Public setters allow uncontrolled state changes
class ${this.props.className} {
    private status: string

    public setStatus(status: string): void {
        this.status = status  // No validation!
    }

    public getStatus(): string {
        return this.status
    }
}

// ✅ Good: Business methods with validation
class ${this.props.className} {
    private status: OrderStatus

    public approve(): void {
        if (!this.canBeApproved()) {
            throw new CannotApproveOrderError()
        }
        this.status = OrderStatus.APPROVED
        this.events.push(new OrderApprovedEvent(this.id))
    }

    public reject(reason: string): void {
        if (!this.canBeRejected()) {
            throw new CannotRejectOrderError()
        }
        this.status = OrderStatus.REJECTED
        this.rejectionReason = reason
        this.events.push(new OrderRejectedEvent(this.id, reason))
    }

    public getStatus(): OrderStatus {
        return this.status
    }

    private canBeApproved(): boolean {
        return this.status === OrderStatus.PENDING && this.hasItems()
    }
}`
        }

        return `
// ❌ Bad: Anemic model (only getters/setters)
class ${this.props.className} {
    getStatus() { return this.status }
    setStatus(status: string) { this.status = status }

    getTotal() { return this.total }
    setTotal(total: number) { this.total = total }
}

class OrderService {
    approve(order: ${this.props.className}): void {
        if (order.getStatus() !== '${EXAMPLE_CODE_CONSTANTS.ORDER_STATUS_PENDING}') {
            throw new Error('${EXAMPLE_CODE_CONSTANTS.CANNOT_APPROVE_ERROR}')
        }
        order.setStatus('${EXAMPLE_CODE_CONSTANTS.ORDER_STATUS_APPROVED}')
    }
}

// ✅ Good: Rich domain model with business logic
class ${this.props.className} {
    private readonly id: OrderId
    private status: OrderStatus
    private items: OrderItem[]
    private events: DomainEvent[] = []

    public approve(): void {
        if (!this.isPending()) {
            throw new CannotApproveOrderError()
        }
        this.status = OrderStatus.APPROVED
        this.events.push(new OrderApprovedEvent(this.id))
    }

    public calculateTotal(): Money {
        return this.items.reduce(
            (sum, item) => sum.add(item.getPrice()),
            Money.zero()
        )
    }

    public addItem(item: OrderItem): void {
        if (this.isApproved()) {
            throw new CannotModifyApprovedOrderError()
        }
        this.items.push(item)
    }

    public getStatus(): OrderStatus {
        return this.status
    }

    private isPending(): boolean {
        return this.status === OrderStatus.PENDING
    }

    private isApproved(): boolean {
        return this.status === OrderStatus.APPROVED
    }
}`
    }
}
