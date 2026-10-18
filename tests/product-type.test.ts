import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProductType } from "../src/lib/product-type";

test("accepts suggestions and custom garment names while trimming whitespace", () => {
  for (const name of ["เสื้อเด็ก", "เสื้อผู้ใหญ่", "เสื้อโปโลผู้ใหญ่ แขนยาว", "ชุดกีฬา รุ่นพิเศษ"]) {
    assert.equal(parseProductType(`  ${name}  `), name);
  }
});

test("rejects missing, non-text, blank and oversized garment names", () => {
  for (const value of [undefined, null, 42, {}, [], "", "   ", "x".repeat(121)]) {
    assert.equal(parseProductType(value), null);
  }
  assert.equal(parseProductType("x".repeat(120))?.length, 120);
});
