import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { recordProductChange } from "../src/lib/product-history";
import type { Order } from "../src/types/order";

test("combined SKU edit saves all sections with one audit entry and safe retry", async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 5000 }).connect();
  const collection = client.db(process.env.MONGODB_DB || "vatana").collection<Order>(`test_product_edit_${new ObjectId()}`);
  const _id = new ObjectId(), now = new Date();
  const variants = [{ color: "Blue", sizes: { XS: 0, S: 10, M: 0, L: 0, XL: 0 } }];
  const patch = { styleCode: "SKU-UPDATED", designName: "Updated design", productType: "เสื้อเด็ก", variants: [{ color: "Red", sizes: { XS: 0, S: 5, M: 0, L: 0, XL: 0, XXL: 3 } }],
    workFront: "พิมพ์หน้า", workBack: "พิมพ์หลัง", workSleeves: "", productionSteps: "พิมพ์ → เย็บ", workRemark: "ตรวจสี",
    artworks: [{ caption: "หน้า", imageKey: "products/test.webp" }] };
  try {
    await collection.insertOne({ _id, title: "test", reference: "test", status: "new", orderDate: now, createdAt: now, updatedAt: now,
      products: [{ styleCode: "SKU", designName: "test", productType: "เสื้อผู้ใหญ่", fabricType: "legacy", variants }] });
    await recordProductChange(collection, String(_id), 0, "tester", "production", { status: "sewing" }, { received: 10, sent: 8, defective: 2 });
    const save = () => recordProductChange(collection, String(_id), 0, "tester", "product_details", patch, undefined, "", "combined-edit-request");
    await save(); await save();
    const product = (await collection.findOne({ _id }))!.products[0];
    for (const [key, value] of Object.entries(patch)) assert.deepEqual(product[key as keyof typeof product], value);
    assert.equal(product.fabricType, patch.productType);
    assert.equal(product.status, "sewing");
    assert.equal(product.history!.length, 2);
    assert.deepEqual(product.history![0].quantities, { received: 10, sent: 8, defective: 2 });
    const edit = product.history![1];
    assert.equal(edit.kind, "product_details");
    assert.equal(edit.before.styleCode, "SKU");
    assert.equal(edit.before.designName, "test");
    assert.equal(edit.before.productType, "เสื้อผู้ใหญ่");
    assert.equal(edit.before.fabricType, "legacy");
    assert.deepEqual(edit.before.variants, variants);
    assert.deepEqual(edit.after, { ...patch, fabricType: patch.productType });
  } finally { await collection.drop(); await client.close(); }
});
