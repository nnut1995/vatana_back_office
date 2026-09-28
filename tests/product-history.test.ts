import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { recordProductChange, validQuantities } from "../src/lib/product-history";
import type { Order } from "../src/types/order";

test("production quantities reject incomplete, negative, fractional and unbalanced values", () => {
  for (const q of [null, {}, { received: 0, sent: 0, defective: 0 },
    { received: 10, sent: 9, defective: 2 }, { received: 10, sent: -1, defective: 0 },
    { received: 10.5, sent: 8, defective: 2 }, { received: "10", sent: 8, defective: 2 }]) {
    assert.equal(validQuantities(q), false);
  }
  assert.equal(validQuantities({ received: 10, sent: 8, defective: 2 }), true);
  assert.equal(validQuantities({ received: 10, sent: 6, defective: 2 }), true);
});

test("atomic history preserves every change, concurrent writes and retry identity", async () => {
  assert.ok(process.env.MONGODB_URI, "Run with --env-file=.env.local");
  const client = await new MongoClient(process.env.MONGODB_URI).connect();
  const collection = client.db(process.env.MONGODB_DB || "vatana")
    .collection<Order>(`test_product_history_${new ObjectId()}`);
  const _id = new ObjectId();
  const now = new Date();
  const product = { styleCode: "AUDIT-TEST", designName: "test", productType: "test",
    status: "sample" as const, instructions: ["legacy finishing"], finishings: [], variants: [{ color: "white", sizes: { XS: 0, S: 10, M: 0, L: 0, XL: 0 } }] };
  try {
    await collection.insertOne({ _id, title: "isolated test", reference: "test", status: "new", orderDate: now, createdAt: now, updatedAt: now, products: [product] });
    const write = (requestId: string) => recordProductChange(collection, _id.toString(), 0, "test-actor", "production",
      { status: "sewing" }, { received: 10, sent: 8, defective: 2 }, "ตะเข็บขาด", requestId);
    await Promise.all([write("same-request-id"), write("same-request-id")]);
    let saved = (await collection.findOne({ _id }))!.products[0];
    assert.equal(saved.history?.length, 1);
    assert.equal(saved.status, "sewing");
    assert.equal(saved.history![0].from, "sample");
    assert.deepEqual(saved.history![0].quantities, { received: 10, sent: 8, defective: 2 });
    assert.equal(saved.history![0].actor, "test-actor");
    assert.ok(Number.isFinite(Date.parse(saved.history![0].at)));
    const first = saved.history![0];
    await Promise.all([
      recordProductChange(collection, _id.toString(), 0, "staff-a", "production", { productionNotes: "new notes" }),
      recordProductChange(collection, _id.toString(), 0, "staff-b", "image", { imageKey: "products/test.webp" }),
      recordProductChange(collection, _id.toString(), 0, "staff-c", "finishings", { finishings: [{ description: "ตกแต่ง" }] }),
    ]);
    saved = (await collection.findOne({ _id }))!.products[0];
    assert.equal(saved.history?.length, 4);
    assert.deepEqual(saved.history![0], first);
    assert.equal(saved.productionNotes, "new notes");
    assert.equal(saved.imageKey, "products/test.webp");
    assert.deepEqual(saved.variants, product.variants);
    assert.equal(saved.instructions, undefined);
    const finishingEntry = saved.history!.find(e => e.kind === "finishings")!;
    assert.deepEqual(finishingEntry.before.finishings, [{ description: "legacy finishing" }]);
    await assert.rejects(recordProductChange(collection, _id.toString(), 0, "test", "production", { status: "sent" }, { received: 10, sent: 12, defective: 0 }));
    assert.equal((await collection.findOne({ _id }))!.products[0].history?.length, 4);
    assert.equal(await recordProductChange(collection, _id.toString(), 99, "test", "production", { status: "sent" }), false);
  } finally {
    await collection.drop();
    await client.close();
  }
});
