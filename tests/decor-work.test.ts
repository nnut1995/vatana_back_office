import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { parseDecorWork, decorDone, decorQuantities, DECOR_STEPS } from "../src/lib/decor-work";
import { recordDecorWork } from "../src/lib/decor-work-data";
import type { DecorWorkInput, Order, OrderProduct } from "../src/types/order";

const product: OrderProduct = { styleCode: "MMF1024", designName: "test", productType: "เสื้อผู้ใหญ่", status: "decor",
  variants: [{ color: "ดำ", sizes: { XS: 60, S: 85, M: 85, L: 85, XL: 85 } }] };
const input: DecorWorkInput = { employee: "พนักงาน A", step: "ติดหน้า", date: "2026-10-01", period: "morning",
  quantities: [{ variantIndex: 0, color: "ดำ", sizes: { XS: 60, S: 85, M: 85 } }] };

test("decor work accepts partial batches, custom steps, OT and child XXL", () => {
  assert.equal(DECOR_STEPS.length, 8);
  assert.deepEqual(parseDecorWork(input), input);
  assert.equal(parseDecorWork({ ...input, step: " ติดแผ่น ", period: "ot" }).step, "ติดแผ่น");
  const child = { ...product, variants: [{ color: "ดำ", sizes: { XS: 0, S: 10, M: 0, L: 0, XL: 0, XXL: 20 } }] };
  const childInput = parseDecorWork({ ...input, quantities: [{ variantIndex: 0, color: "ดำ", sizes: { XXL: 20 } }] });
  assert.equal(decorQuantities(child, childInput)[0].sizes.XXL, 20);
});

test("decor work allows a batch above ordered quantity and sizes with zero ordered units", () => {
  const draft = parseDecorWork({ ...input, quantities: [{ variantIndex: 0, color: "ดำ", sizes: { XS: 100, S: 90 } }] });
  assert.equal(decorQuantities(product, draft)[0].sizes.XS, 100);
  const zeroOrdered = { ...product, variants: [{ ...product.variants[0], sizes: { ...product.variants[0].sizes, XS: 0 } }] };
  assert.equal(decorQuantities(zeroOrdered, draft)[0].sizes.XS, 100);
  assert.equal(product.variants[0].sizes.XS, 60);
});

test("reject invalid dates, periods, empty batches, wrong sizes and invalid quantities", () => {
  for (const invalid of [null, {}, { ...input, date: "2026-02-30" }, { ...input, date: "2026-13-01" },
    { ...input, period: "evening" }, { ...input, employee: " " }, { ...input, step: " " },
    { ...input, quantities: [] }, { ...input, quantities: [...input.quantities, ...input.quantities] }]) {
    assert.throws(() => parseDecorWork(invalid));
  }
  for (const sizes of [{ S: -1 }, { S: 1.5 }, { S: "10" }, { XXXL: 10 }, { S: 0 }, { S: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.throws(() => parseDecorWork({ ...input, quantities: [{ variantIndex: 0, color: "ดำ", sizes }] }));
  }
  assert.throws(() => decorQuantities(product, { ...input, quantities: [{ variantIndex: 0, color: "ขาว", sizes: { S: 1 } }] }));
});

test("morning + afternoon totals remain separate from ironing and different colours", () => {
  const done = { ...product, decorWork: [{ ...input, id: "test", actor: "recorder", at: "2026-10-01T05:00:00Z",
    quantities: decorQuantities(product, input) }] };
  assert.equal(decorDone(done, "ติดหน้า", "ดำ", "XS"), 60);
  assert.equal(decorDone(done, "รีดหน้า", "ดำ", "XS"), 0);
  assert.equal(decorDone(done, "ติดหน้า", "ขาว", "XS"), 0);
  assert.equal(decorQuantities(done, input)[0].sizes.XS, 60);
  const afternoon = { ...input, period: "afternoon" as const, quantities: [{ variantIndex: 0, color: "ดำ", sizes: { L: 85, XL: 85 } }] };
  assert.equal(decorQuantities(done, afternoon)[0].sizes.L, 85);
  const reordered = { ...done, variants: [{ color: "ขาว", sizes: product.variants[0].sizes }, ...product.variants] };
  assert.equal(decorDone(reordered, "ติดหน้า", "ดำ", "S"), 85);
  assert.throws(() => decorQuantities(reordered, afternoon), /โหลดงานใหม่/);
});

test("configured colour IDs keep totals after a colour rename", () => {
  const colorId = new ObjectId().toString();
  const coloredInput = { ...input, quantities: [{ ...input.quantities[0], colorId }] };
  const coloredProduct = { ...product, variants: [{ ...product.variants[0], colorId }] };
  const done = { ...coloredProduct, decorWork: [{ ...coloredInput, id: "test", actor: "recorder", at: "2026-10-01T05:00:00Z",
    quantities: decorQuantities(coloredProduct, coloredInput) }] };
  const renamed = { ...done, variants: [{ ...coloredProduct.variants[0], color: "ดำเข้ม" }] };
  assert.equal(decorDone(renamed, "ติดหน้า", "ดำเข้ม", "XS", colorId), 60);
  assert.equal(decorQuantities(renamed, coloredInput)[0].sizes.XS, 60);
  assert.equal(renamed.decorWork[0].quantities[0].color, "ดำ");
});

test("atomic writes handle duplicate retries, concurrent batches and changed stages", { skip: !process.env.MONGODB_URI }, async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!).connect();
  const collection = client.db(process.env.MONGODB_DB || "vatana").collection<Order>(`test_decor_work_${new ObjectId()}`);
  const _id = new ObjectId();
  const now = new Date();
  try {
    await collection.insertOne({ _id, title: "isolated test", reference: "decor-test", status: "new", orderDate: now, createdAt: now, updatedAt: now, products: [product] });
    const write = (draft: DecorWorkInput, id: string) => recordDecorWork(collection, _id.toString(), 0, "recorder", draft, id);
    await Promise.all([write(input, "same-request-id"), write(input, "same-request-id")]);
    let saved = (await collection.findOne({ _id }))!.products[0];
    assert.equal(saved.decorWork?.length, 1);
    assert.equal(saved.decorWork![0].employee, "พนักงาน A");
    assert.equal(saved.decorWork![0].actor, "recorder");
    assert.equal(saved.status, "decor");
    const afternoon: DecorWorkInput = { ...input, period: "afternoon", quantities: [{ variantIndex: 0, color: "ดำ", sizes: { L: 85, XL: 85 } }] };
    const ironing: DecorWorkInput = { ...input, employee: "พนักงาน B", step: "รีดหน้า", period: "ot", quantities: [{ variantIndex: 0, color: "ดำ", sizes: product.variants[0].sizes }] };
    const neck: DecorWorkInput = { ...ironing, employee: "พนักงาน C", step: "พิมพ์คอ" };
    await Promise.all([write(afternoon, "afternoon-request"), write(ironing, "ironing-request"), write(neck, "neck-request")]);
    saved = (await collection.findOne({ _id }))!.products[0];
    assert.equal(saved.decorWork?.length, 4);
    assert.equal(decorDone(saved, "ติดหน้า", "ดำ", "L"), 85);
    assert.equal(decorDone(saved, "รีดหน้า", "ดำ", "XS"), 60);
    assert.equal(await write(input, "excess-request"), true);
    saved = (await collection.findOne({ _id }))!.products[0];
    assert.equal(decorDone(saved, "ติดหน้า", "ดำ", "XS"), 120);
    assert.equal(await write(input, "excess-request"), true);
    assert.equal((await collection.findOne({ _id }))!.products[0].decorWork?.length, 5);
    // Distinct batches can both be saved even when their cumulative total exceeds the order.
    const custom = { ...input, step: "ตรวจป้าย" };
    const outcomes = await Promise.allSettled([write(custom, "custom-request-a"), write(custom, "custom-request-b")]);
    assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 2);
    saved = (await collection.findOne({ _id }))!.products[0];
    assert.equal(decorDone(saved, "ตรวจป้าย", "ดำ", "XS"), 120);
    await collection.updateOne({ _id }, { $set: { "products.0.status": "sewing" }, $inc: { "products.0.revision": 1 } });
    assert.equal(await write(input, "same-request-id"), true);
    assert.equal(await write({ ...input, step: "ดึงป้าย" }, "later-request"), false);
    await collection.updateOne({ _id }, { $set: { status: "cancelled" } });
    assert.equal(await write(input, "cancelled-request"), false);
  } finally { await collection.drop(); await client.close(); }
});
