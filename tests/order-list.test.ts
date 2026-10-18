import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { parseOrderListParams, queryOrderPage, orderListUrl } from "../src/lib/order-list";
import type { Order } from "../src/types/order";

test("normalizes URL filters, page sizes and unsupported sorts", () => {
 assert.deepEqual(parseOrderListParams({ page: "-1", pageSize: "500", sort: "__proto__", status: "bogus", q: " abc " }), { q: "abc", status: "", sort: "newest", page: 1, pageSize: 10 });
 const options = parseOrderListParams({ q: "A&B", status: "new", pageSize: "25", sort: "oldest" });
 const url = new URL(orderListUrl(options, 2), "http://localhost");
 assert.equal(url.searchParams.get("q"), "A&B"); assert.equal(url.searchParams.get("page"), "2");
});

test("database pagination sorts newest creation first and filters before counting", async () => {
 assert.ok(process.env.MONGODB_URI);
 const client = await new MongoClient(process.env.MONGODB_URI).connect();
 const collection = client.db(process.env.MONGODB_DB || "vatana").collection<Order>(`test_order_list_${new ObjectId()}`);
 try {
  const orders = Array.from({ length: 205 }, (_, i): Order => ({ _id: new ObjectId(), title: i === 0 ? "Literal [test]" : `Order ${i}`, reference: `REF-${i}`, status: i % 2 ? "completed" : "new", orderDate: new Date(2026, 0, 205 - i), createdAt: new Date(2026, 0, 1, 0, 0, i), updatedAt: new Date(), products: [{ styleCode: i === 100 ? "SEARCH-SKU" : "plain", designName: "test", productType: "test", variants: [] }] }));
  await collection.insertMany(orders);
  const defaults = parseOrderListParams({});
  const first = await queryOrderPage(collection, defaults);
  assert.equal(first.total, 205); assert.equal(first.pages, 21);
  assert.equal(first.orders[0].reference, "REF-204");
  const second = await queryOrderPage(collection, { ...defaults, page: 2 });
  assert.equal(second.orders[0].reference, "REF-194");
  assert.equal(new Set([...first.orders, ...second.orders].map(o => String(o._id))).size, 20);
  const last = await queryOrderPage(collection, { ...defaults, page: 999 });
  assert.equal(last.page, 21); assert.equal(last.orders.length, 5);
  const filtered = await queryOrderPage(collection, { ...defaults, status: "new" });
  assert.equal(filtered.total, 103); assert.equal(filtered.orders.every(o => o.status === "new"), true);
  assert.equal((await queryOrderPage(collection, { ...defaults, q: "[test]" })).total, 1);
  assert.equal((await queryOrderPage(collection, { ...defaults, q: "search-sku" })).orders[0].reference, "REF-100");
  assert.equal((await queryOrderPage(collection, { ...defaults, sort: "oldest" })).orders[0].reference, "REF-0");
  assert.equal((await queryOrderPage(collection, { ...defaults, sort: "date_desc" })).orders[0].reference, "REF-0");
  assert.equal((await queryOrderPage(collection, { ...defaults, q: "missing" })).total, 0);
  await collection.updateOne({ reference: "REF-50" }, { $set: { deliveryDate: "2026-03-01" } });
  await collection.updateOne({ reference: "REF-60" }, { $set: { deliveryDate: "2026-02-01" } });
  const byDelivery = await queryOrderPage(collection, { ...defaults, sort: "delivery" });
  assert.deepEqual(byDelivery.orders.slice(0, 3).map(o => o.reference), ["REF-60", "REF-50", "REF-204"]);
  assert.equal(byDelivery.total, 205);
  const lastDelivery = await queryOrderPage(collection, { ...defaults, sort: "delivery", page: 21 });
  assert.equal(lastDelivery.orders.length, 5);
  const allDelivery = await Promise.all(Array.from({ length: 21 }, (_, i) => queryOrderPage(collection, { ...defaults, sort: "delivery", page: i + 1 })));
  assert.equal(new Set(allDelivery.flatMap(r => r.orders.map(o => String(o._id)))).size, 205);
 } finally { await collection.drop(); await client.close(); }
});
