import { listColors } from "@/lib/colors";
import { applyOrderColors } from "@/lib/color-config";
import { requirePageUser } from "@/lib/access";
import { canWorkProduct } from "@/lib/permissions";
import { getDb } from "@/lib/mongodb";
import { serializeOrder } from "@/lib/orders";
import { departmentProducts } from "@/lib/department-products";
import type { Order } from "@/types/order";

/** Work queues must not inherit the 200-order limit of the order list. */
export async function listDepartmentProducts() {
  const user = await requirePageUser();
  const db = await getDb();
  const orders = await db.collection<Order>("orders")
    .find({ status: { $ne: "cancelled" } })
    .sort({ orderDate: 1, createdAt: 1 }).toArray();
  const colors = await listColors();
  return departmentProducts(orders.map(order => applyOrderColors(serializeOrder(order), colors))).filter(item => canWorkProduct(user, item.product));
}
