import assert from "node:assert/strict";
import { test } from "node:test";
import { MongoClient, ObjectId } from "mongodb";
import { parseColorInput, colorText, applyOrderColors } from "../src/lib/color-config";
import { assignConfiguredColors, saveColor, type ColorDocument } from "../src/lib/colors";
import { parseVariants } from "../src/lib/product-variants";
import { orderSheetHtml } from "../src/lib/order-sheet-html";
import type { SerializedOrder } from "../src/types/order";
const colors = [{ id: "0123456789abcdef01234567", name: "กรม NAVY", hex: "#1E293B" }];
const sizes = { XS: 0, S: 10, M: 0, L: 0, XL: 0 };
const order: SerializedOrder = { _id: "test", title: "test", reference: "test", orderDate: "2026-10-02", createdAt: "2026-10-02", updatedAt: "2026-10-02", status: "new",
  products: [{ styleCode: "SKU", designName: "Test", productType: "เสื้อผู้ใหญ่", variants: [{ color: "old name", colorId: colors[0].id, colorHex: "#FFFFFF", sizes }] }] };

test("color config validates names and six-digit HEX and normalizes duplicate key", () => {
  assert.deepEqual(parseColorInput({ name: " Navy ", hex: " #1e293b " }), { name: "Navy", nameKey: "navy", hex: "#1E293B" });
  for (const input of [null, [], {}, { name: "", hex: "#FFFFFF" }, { name: "x".repeat(101), hex: "#FFFFFF" }, { name: "Navy", hex: "red" }, { name: "Navy", hex: "#FFF" }, { name: "Navy", hex: "#000000;display:none" }]) assert.throws(() => parseColorInput(input));
});
test("assignment uses the catalog rather than forged client name or HEX", () => {
  const parsed = parseVariants([{ color: "forged", colorId: colors[0].id, colorHex: "#FFFFFF", sizes }]);
  assert.deepEqual(assignConfiguredColors(parsed, colors), [{ color: "กรม NAVY", colorId: colors[0].id, colorHex: "#1E293B", sizes }]);
  assert.throws(() => parseVariants([{ color: "Navy", colorId: "bad", sizes }]));
  assert.throws(() => assignConfiguredColors([{ color: "unknown", sizes }], colors));
  assert.throws(() => assignConfiguredColors([{ color: "unknown", colorId: "abcdefabcdefabcdefabcdef", sizes }], colors));
  assert.throws(() => assignConfiguredColors([{ color: "name 1", colorId: colors[0].id, sizes }, { color: "name 2", colorId: colors[0].id, sizes }], colors));
});
test("old unassigned colors can be retained but newly typed colors must be configured", () => {
  const old = [{ color: "Legacy", sizes }];
  assert.deepEqual(assignConfiguredColors(old, [], old), old);
  assert.throws(() => assignConfiguredColors([{ color: "New", sizes }], [], old));
  assert.equal(assignConfiguredColors([{ color: "กรม navy", sizes }], colors)[0].colorId, colors[0].id);
});
test("current config values flow into displays without changing stored order or history", () => {
  const displayed = applyOrderColors(order, colors);
  assert.equal(displayed.products[0].variants[0].colorHex, "#1E293B");
  assert.equal(displayed.products[0].variants[0].color, "กรม NAVY");
  assert.equal(order.products[0].variants[0].colorHex, "#FFFFFF");
  const renamed = applyOrderColors(order, [{ ...colors[0], name: "New navy", hex: "#123456" }]);
  assert.equal(renamed.products[0].variants[0].color, "New navy");
  assert.equal(renamed.products[0].variants[0].colorHex, "#123456");
});
test("PDF uses configured fills and readable black or white text; invalid CSS is ignored", () => {
  const html = orderSheetHtml(applyOrderColors(order, colors));
  assert.ok(html.includes('background:#1E293B;color:#FFFFFF'));
  assert.ok(html.includes("กรม NAVY"));
  assert.equal(colorText("#FFFFFF"), "#000000");
  assert.equal(colorText("#000000"), "#FFFFFF");
  const bad = structuredClone(order); bad.products[0].variants[0].colorHex = "red;display:none";
  assert.ok(!orderSheetHtml(bad).includes("red;display:none"));
});
test("catalog persists additions and updates while rejecting duplicate names", async () => {
  const client = await new MongoClient(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 5000 }).connect();
  const collection = client.db(process.env.MONGODB_DB || "vatana").collection<ColorDocument>(`test_colors_${new ObjectId()}`);
  try {
    const id = await saveColor(collection, { name: " Navy ", hex: "#1e293b" });
    let saved = (await collection.findOne({ _id: new ObjectId(id) }))!;
    assert.equal(saved.hex, "#1E293B"); assert.equal(saved.name, "Navy");
    await assert.rejects(saveColor(collection, { name: "NAVY", hex: "#000000" }));
    await saveColor(collection, { name: "Navy updated", hex: "#123456" }, id);
    saved = (await collection.findOne({ _id: new ObjectId(id) }))!;
    assert.equal(saved.name, "Navy updated"); assert.equal(saved.hex, "#123456");
    assert.equal(await collection.countDocuments(), 1);
  } finally { await collection.drop(); await client.close(); }
});
