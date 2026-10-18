import { productStatus, type OrderProduct, type OrderStatus, type ProductStatus, type SerializedOrder } from "@/types/order";

export interface DepartmentProduct {
  orderId: string;
  orderReference: string;
  orderDate: string;
  orderStatus: OrderStatus;
  deliveryDate?: string;
  index: number;
  product: OrderProduct;
}

/** Preserve the original array index: writes must target this exact SKU occurrence. */
export function departmentProducts(orders: SerializedOrder[], stage?: ProductStatus): DepartmentProduct[] {
  return orders.filter(o => o.status !== "cancelled")
    .flatMap(order => order.products.map((product, index) => ({
      orderId: order._id, orderReference: order.reference, orderDate: order.orderDate,
      orderStatus: order.status, deliveryDate: order.deliveryDate || undefined, index, product,
    })))
    .filter(item => !stage || productStatus(item.product) === stage);
}

export const QUEUE_SORTS = {
  order: "สั่งก่อน ทำก่อน",
  delivery: "กำหนดส่งใกล้สุดก่อน",
} as const;
export type QueueSort = keyof typeof QUEUE_SORTS;

/** "order" keeps the incoming order (oldest order first). "delivery" puts the nearest due date first and undated work last. */
export function sortQueue(items: DepartmentProduct[], sort: QueueSort): DepartmentProduct[] {
  if (sort === "order") return items;
  return items
    .map((item, position) => ({ item, position }))
    .sort((a, b) => {
      const da = a.item.deliveryDate, db = b.item.deliveryDate;
      if (da && db && da !== db) return da < db ? -1 : 1;
      if (!da !== !db) return da ? -1 : 1;
      return a.position - b.position;
    })
    .map(({ item }) => item);
}
