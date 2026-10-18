import assert from "node:assert/strict";
import { test } from "node:test";
import { ObjectId, type Collection } from "mongodb";
import { parseWorkDetails, emptyWorkDetails, WORK_DETAIL_FIELDS } from "../src/lib/work-details";
import { recordProductChange } from "../src/lib/product-history";
import type { Order, OrderProduct } from "../src/types/order";

test("work details keep position, sequence and remark separate and trim whitespace", () => {
  assert.deepEqual(parseWorkDetails({ workFront: "  พิมพ์ + GLOW ", workBack: "ทรานสเฟอร์", workSleeves: "ทรานสเฟอร์",
    productionSteps: " พิมพ์หน้า → ตกแต่งหลัง + แขน\nตรวจงาน ", workRemark: " ตรวจตำแหน่ง " }), {
    workFront: "พิมพ์ + GLOW", workBack: "ทรานสเฟอร์", workSleeves: "ทรานสเฟอร์",
    productionSteps: "พิมพ์หน้า → ตกแต่งหลัง + แขน\nตรวจงาน", workRemark: "ตรวจตำแหน่ง",
  });
  assert.deepEqual(parseWorkDetails({}), emptyWorkDetails());
});

test("work detail validation rejects malformed and oversized values in every field", () => {
  for (const value of [null, [], "text", 1]) assert.equal(parseWorkDetails(value), null);
  for (const field of WORK_DETAIL_FIELDS) {
    for (const value of [null, 10, {}, [], "x".repeat(5001)]) assert.equal(parseWorkDetails({ [field]: value }), null);
    assert.equal(parseWorkDetails({ [field]: "x".repeat(5000) })?.[field].length, 5000);
  }
});

test("work specification updates and remark removal retain full audit snapshots atomically", async () => {
  const product: OrderProduct = { styleCode: "WORK-TEST", designName: "test", productType: "เสื้อเด็ก",
    variants: [], status: "printing", productionNotes: "บันทึกจากแผนก", ...emptyWorkDetails(), workRemark: "หมายเหตุเดิม" };
  let update: Record<string, unknown> | undefined;
  const collection = {
    findOne: async () => ({ products: [product] }),
    updateOne: async (_filter: unknown, changes: Record<string, unknown>) => { update = changes; return { matchedCount: 1 }; },
  } as unknown as Collection<Order>;
  const details = { ...emptyWorkDetails(), workFront: "พิมพ์ + GLOW", workBack: "ทรานสเฟอร์", workSleeves: "ทรานสเฟอร์",
    productionSteps: "แผนกพิมพ์ → แผนกตกแต่ง", workRemark: "" };
  assert.equal(await recordProductChange(collection, new ObjectId().toString(), 0, "tester", "work_details", details), true);
  const set = update!.$set as Record<string, unknown>;
  assert.equal(set["products.0.workRemark"], "");
  assert.equal(set["products.0.workFront"], "พิมพ์ + GLOW");
  assert.equal(Object.hasOwn(set, "products.0.productionNotes"), false);
  const entry = (update!.$push as Record<string, { before: Record<string, unknown>; after: unknown; kind: string }>)["products.0.history"];
  assert.equal(entry.before.workRemark, "หมายเหตุเดิม");
  assert.deepEqual(entry.after, details);
  assert.equal(entry.kind, "work_details");
});
