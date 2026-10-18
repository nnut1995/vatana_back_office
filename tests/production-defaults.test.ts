import assert from "node:assert/strict";
import { test } from "node:test";
import { previousStageOutput } from "../src/lib/production-defaults";
import type { ProductHistoryEntry } from "../src/types/order";
const entry = (to: ProductHistoryEntry["to"], sent: number): ProductHistoryEntry => ({ id: "test", at: "2026-09-28", actor: "test", kind: "production", from: "sample", to, before: {}, after: {}, note: "", quantities: { received: 10, sent, defective: 0 } });
test("uses latest recorded output from a different department, including skipped stages and zero", () => {
 const history = [entry("sewing", 8), entry("sewing", 6), entry("folding", 5)];
 assert.deepEqual(previousStageOutput(history, "folding"), { stage: "sewing", sent: 6 });
 assert.deepEqual(previousStageOutput(history, "sent"), { stage: "folding", sent: 5 });
 assert.deepEqual(previousStageOutput([entry("sewing", 0)], "packing"), { stage: "sewing", sent: 0 });
 assert.equal(previousStageOutput([], "sample"), undefined);
 assert.equal(previousStageOutput([entry("sewing", 8)], "sewing"), undefined);
 assert.equal(previousStageOutput([{ ...entry("sewing", 8), kind: "image" }], "folding"), undefined);
});
