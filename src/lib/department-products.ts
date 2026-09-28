import { productStatus, type OrderProduct, type ProductStatus, type SerializedOrder } from "@/types/order";

export interface DepartmentProduct {
  orderId: string;
  orderReference: string;
  orderDate: string;
  index: number;
  product: OrderProduct;
}

/** Preserve the original array index: writes must target this exact SKU occurrence. */
export function departmentProducts(orders: SerializedOrder[], stage?: ProductStatus): DepartmentProduct[] {
  return orders.filter(o => o.status === "new" || o.status === "in_production")
    .flatMap(order => order.products.map((product, index) => ({
      orderId: order._id, orderReference: order.reference, orderDate: order.orderDate, index, product,
    })))
    .filter(item => !stage || productStatus(item.product) === stage);
}
