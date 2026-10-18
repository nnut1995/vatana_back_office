import assert from "node:assert/strict";
import { test } from "node:test";
import { daysUntil, deliveryLabel, deliveryState, todayInBangkok } from "../src/lib/order-urgency";

test("counts whole days between dates", () => {
  assert.equal(daysUntil("2026-10-20", "2026-10-18"), 2);
  assert.equal(daysUntil("2026-10-15", "2026-10-18"), -3);
  assert.equal(daysUntil("2026-10-18T00:00:00.000Z", "2026-10-18"), 0);
});

test("classifies open orders by delivery date", () => {
  const today = "2026-10-18";
  assert.equal(deliveryState({ status: "new", deliveryDate: "2026-10-17" }, today), "overdue");
  assert.equal(deliveryState({ status: "in_production", deliveryDate: "2026-10-18" }, today), "today");
  assert.equal(deliveryState({ status: "new", deliveryDate: "2026-10-25" }, today), "soon");
  assert.equal(deliveryState({ status: "new", deliveryDate: "2026-10-26" }, today), "later");
  assert.equal(deliveryState({ status: "new" }, today), "none");
  assert.equal(deliveryLabel({ status: "new", deliveryDate: "2026-10-15" }, today), "เลยกำหนด 3 วัน");
  assert.equal(deliveryLabel({ status: "new", deliveryDate: "2026-10-20" }, today), "อีก 2 วัน");
});

test("finished and cancelled orders are never late", () => {
  for (const status of ["completed", "cancelled", "shipped"] as const)
    assert.equal(deliveryState({ status, deliveryDate: "2020-01-01" }, "2026-10-18"), "closed");
});

test("uses the Bangkok calendar day", () => {
  assert.equal(todayInBangkok(new Date("2026-10-18T18:30:00Z")), "2026-10-19");
  assert.equal(todayInBangkok(new Date("2026-10-18T16:30:00Z")), "2026-10-18");
});
