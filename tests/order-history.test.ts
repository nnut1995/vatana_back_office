import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { recordOrderStatusChange } from "../src/lib/order-history";
import { ORDER_STATUSES, type Order } from "../src/types/order";

test("order status changes are atomic, append-only and retry-safe; shipped is historical only", async () => {
  assert.equal((ORDER_STATUSES as readonly string[]).includes("shipped"), false);
  assert.ok(process.env.MONGODB_URI);
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  const collection = client.db(process.env.MONGODB_DB || "vatana").collection<Order>(`test_order_history_${new ObjectId()}`);
  const _id = new ObjectId(); const now = new Date();
  try {
    await collection.insertOne({ _id, title: "isolated test", reference: "test", status: "shipped", products: [], createdAt: now, updatedAt: now, orderDate: now });
    const change = () => recordOrderStatusChange(collection, String(_id), "in_production", "test-actor", "same-request");
    await Promise.all([change(), change()]);
    let saved = (await collection.findOne({ _id }))!;
    assert.equal(saved.status, "in_production");
    assert.equal(saved.statusHistory?.length, 1);
    const first = saved.statusHistory![0];
    assert.equal(first.from, "shipped"); assert.equal(first.to, "in_production");
    assert.equal(first.actor, "test-actor"); assert.ok(Number.isFinite(Date.parse(first.at)));
    await recordOrderStatusChange(collection, String(_id), "in_production", "test-actor");
    assert.equal((await collection.findOne({ _id }))!.statusHistory?.length, 1);
    await Promise.all([
      recordOrderStatusChange(collection, String(_id), "completed", "staff-a", "finish-request"),
      recordOrderStatusChange(collection, String(_id), "cancelled", "staff-b", "cancel-request"),
    ]);
    saved = (await collection.findOne({ _id }))!;
    assert.equal(saved.statusHistory?.length, 3);
    assert.deepEqual(saved.statusHistory![0], first);
    assert.equal(saved.statusHistory![2].from, saved.statusHistory![1].to);
    assert.equal(saved.status, saved.statusHistory![2].to);
    await change();
    assert.equal((await collection.findOne({ _id }))!.status, saved.status);
    await assert.rejects(recordOrderStatusChange(collection, String(_id), "shipped", "test"));
    assert.equal((await collection.findOne({ _id }))!.statusHistory?.length, 3);
  } finally { await collection.drop(); await client.close(); }
});
