import assert from "node:assert/strict";
import { test } from "node:test";
import { departmentProducts } from "../src/lib/department-products";
import type { SerializedOrder, OrderProduct } from "../src/types/order";

const product = (status?: OrderProduct["status"]): OrderProduct => ({ styleCode: "SAME-SKU", designName: "test", productType: "test", status, variants: [] });
const order = (id: string, status: SerializedOrder["status"], products: OrderProduct[]): SerializedOrder => ({ _id: id, reference: id, title: id, status, products, orderDate: "2026-09-28", createdAt: "2026-09-28", updatedAt: "2026-09-28" });

test("department queues select individual products and retain original write targets", () => {
  const orders = [order("a", "new", [product("printing"), product("sewing")]), order("b", "in_production", [product("sewing")])];
  const queue = departmentProducts(orders, "sewing");
  assert.deepEqual(queue.map(p => [p.orderId, p.index]), [["a", 1], ["b", 0]]);
  orders[0].products[1].status = "folding";
  assert.deepEqual(departmentProducts(orders, "sewing").map(p => p.orderId), ["b"]);
  assert.equal(departmentProducts(orders, "folding")[0].index, 1);
});

test("cancelled orders are excluded; shipped and completed orders retain product queues", () => {
  const orders = [order("active", "new", [product()]), ...(["cancelled", "completed", "shipped"] as const).map(status => order(status, status, [product("sample")]))];
  assert.deepEqual(departmentProducts(orders, "sample").map(p => p.orderId), ["active", "completed", "shipped"]);
  assert.equal(departmentProducts(orders, "sewing").length, 0);
  assert.equal(departmentProducts(Array.from({length: 250}, (_, i) => order(String(i), "new", [product()]))).length, 250);
});


test("a SKU moved to fabric preparation stays visible even when its order is shipped", () => {
 const source = order("MLS-RACER-ADULTS", "shipped", [product("wait_for_approval"), product("printing")]);
 source.products[0].status = "fabric_preparation";
 const queue = departmentProducts([source], "fabric_preparation");
 assert.deepEqual(queue.map(item => [item.orderId, item.index, item.product.status]), [["MLS-RACER-ADULTS", 0, "fabric_preparation"]]);
});

test("queues can sort by nearest delivery date, keeping undated work last", async () => {
  const { sortQueue } = await import("../src/lib/department-products");
  const dated = (id: string, deliveryDate?: string) => ({ ...order(id, "new", [product("sewing")]), deliveryDate });
  const queue = departmentProducts([dated("none"), dated("late", "2026-10-30"), dated("soon", "2026-10-20"), dated("none2"), dated("soon2", "2026-10-20")], "sewing");
  assert.deepEqual(sortQueue(queue, "order").map(p => p.orderId), ["none", "late", "soon", "none2", "soon2"]);
  assert.deepEqual(sortQueue(queue, "delivery").map(p => p.orderId), ["soon", "soon2", "late", "none", "none2"]);
  assert.equal(queue[1].deliveryDate, "2026-10-30");
  assert.equal(queue[0].deliveryDate, undefined);
});
