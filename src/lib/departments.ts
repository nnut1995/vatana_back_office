import { getDb } from "@/lib/mongodb";
import { serializeOrder } from "@/lib/orders";
import { departmentProducts } from "@/lib/department-products";
import type { Order } from "@/types/order";

/** Work queues must not inherit the 200-order limit of the order list. */
export async function listDepartmentProducts() {
  const db = await getDb();
  const orders = await db.collection<Order>("orders")
    .find({ status: { $in: ["new", "in_production"] } })
    .sort({ orderDate: 1, createdAt: 1 }).toArray();
  return departmentProducts(orders.map(serializeOrder));
}
