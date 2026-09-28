import { test } from "node:test";
import assert from "node:assert/strict";
import { bangkokDate, filterProductionEntries, summarizeProduction, type ProductionReportEntry } from "../src/lib/production-report";

const event = (at: string, department: ProductionReportEntry["department"] = "sewing"): ProductionReportEntry => ({ id: at, at, department, orderId: "order", reference: "ref", styleCode: "SKU", designName: "design", actor: "staff", note: "", quantities: { received: 10, sent: 8, defective: 2 } });

test("Bangkok day filters include local midnight and the entire final day", () => {
  const entries = [event("2026-09-27T16:59:59.999Z"), event("2026-09-27T17:00:00.000Z"), event("2026-09-28T16:59:59.999Z"), event("2026-09-28T17:00:00.000Z")];
  assert.deepEqual(filterProductionEntries(entries, "2026-09-28", "2026-09-28", ""), entries.slice(1, 3));
  assert.equal(bangkokDate(new Date("2026-09-27T18:00:00Z")), "2026-09-28");
  assert.equal(filterProductionEntries(entries, "2026-09-29", "2026-09-28", "").length, 0);
  assert.equal(filterProductionEntries(entries, "", "", "").length, 4);
});

test("department totals count sent plus defects, not unfinished received work", () => {
  const entries = [event("2026-09-28T00:00:00Z"), event("2026-09-28T01:00:00Z", "folding")];
  entries.push({ ...event("2026-09-28T02:00:00Z"), quantities: { received: 10, sent: 6, defective: 1 } });
  const sewing = summarizeProduction(entries).find(s => s.department === "sewing")!;
  assert.equal(sewing.received, 20);
  assert.equal(sewing.sent, 14);
  assert.equal(sewing.defective, 3);
  assert.equal(sewing.processed, 17);
  assert.equal(sewing.records, 2);
  assert.equal(sewing.defectRate, 3 / 17 * 100);
  assert.equal(filterProductionEntries(entries, "", "", "folding").length, 1);
  assert.equal(summarizeProduction([]).every(s => s.processed === 0 && s.defectRate === 0), true);
});
