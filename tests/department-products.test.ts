import assert from "node:assert/strict";
import { test } from "node:test";
import { departmentProducts } from "../src/lib/department-products";
import type { SerializedOrder, OrderProduct } from "../src/types/order";

const product = (status?: OrderProduct["status"]): OrderProduct => ({ styleCode: "SAME-SKU", designName: "test", productType: "test", status, finishings: [], variants: [] });
const order = (id: string, status: SerializedOrder["status"], products: OrderProduct[]): SerializedOrder => ({ _id: id, reference: id, title: id, status, products, orderDate: "2026-09-28", createdAt: "2026-09-28", updatedAt: "2026-09-28" });

test("department queues select individual products and retain original write targets", () => {
  const orders = [order("a", "new", [product("printing"), product("sewing")]), order("b", "in_production", [product("sewing")])];
  const queue = departmentProducts(orders, "sewing");
  assert.deepEqual(queue.map(p => [p.orderId, p.index]), [["a", 1], ["b", 0]]);
  orders[0].products[1].status = "folding";
  assert.deepEqual(departmentProducts(orders, "sewing").map(p => p.orderId), ["b"]);
  assert.equal(departmentProducts(orders, "folding")[0].index, 1);
});

test("closed orders are excluded and legacy products enter the sample queue", () => {
  const orders = [order("active", "new", [product()]), ...(["cancelled", "completed", "shipped"] as const).map(status => order(status, status, [product("sample")]))];
  assert.deepEqual(departmentProducts(orders, "sample").map(p => p.orderId), ["active"]);
  assert.equal(departmentProducts(orders, "sewing").length, 0);
  assert.equal(departmentProducts(Array.from({length: 250}, (_, i) => order(String(i), "new", [product()]))).length, 250);
});
