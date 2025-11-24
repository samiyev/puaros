import { User } from "../user/User"
import { Product } from "../product/Product"

export class Order {
    private id: string
    private user: User
    private product: Product
    private quantity: number

    constructor(id: string, user: User, product: Product, quantity: number) {
        this.id = id
        this.user = user
        this.product = product
        this.quantity = quantity
    }
}
