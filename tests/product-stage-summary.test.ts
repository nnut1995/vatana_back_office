import { test } from "node:test";
import assert from "node:assert/strict";
import { productStageSummary } from "../src/lib/product-stage-summary";
import type { OrderProduct, ProductHistoryEntry } from "../src/types/order";
const entry = (to: ProductHistoryEntry["to"], quantities?: ProductHistoryEntry["quantities"]): ProductHistoryEntry => ({ id: "test", at: "2026-09-28T00:00:00Z", actor: "test", kind: "production", from: "sample", to, before: {}, after: {}, note: "", quantities });
const product: OrderProduct = { styleCode: "same", designName: "test", productType: "test", finishings: [], variants: [{ color: "white", sizes: { XS: 0, S: 15, M: 0, L: 0, XL: 0 } }] };
test("summarizes quantities under the recorded stage while tracking current status separately", () => {
 const stages = productStageSummary({ ...product, status: "folding", history: [entry("sewing", { received: 10, sent: 8, defective: 2 }), entry("sewing", { received: 5, sent: 3, defective: 1 }), entry("folding"), { ...entry("sewing", { received: 100, sent: 100, defective: 0 }), kind: "image" }] });
 const sewing = stages.find(s => s.stage === "sewing")!;
 assert.deepEqual([sewing.received, sewing.sent, sewing.defective, sewing.remaining, sewing.records, sewing.current], [15, 11, 3, 1, 2, false]);
 const folding = stages.find(s => s.stage === "folding")!;
 assert.equal(folding.current, true);
 assert.equal(folding.records, 0);
});
test("missing quantities do not assume order quantity; products with identical SKU stay independent", () => {
 assert.equal(productStageSummary(product).find(s => s.current)?.stage, "sample");
 assert.equal(productStageSummary(product).every(s => s.records === 0 && s.received === 0), true);
 const other = { ...product, history: [entry("folding", { received: 10, sent: 8, defective: 2 })] };
 assert.equal(productStageSummary(other).find(s => s.stage === "folding")?.sent, 8);
 assert.equal(productStageSummary(product).find(s => s.stage === "folding")?.sent, 0);
});
