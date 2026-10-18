import { test } from "node:test";
import assert from "node:assert/strict";
import { validSheetInput } from "../src/lib/production-sheet-input";
import { orderSheetHtml } from "../src/lib/order-sheet-html";
import type { SerializedOrder } from "../src/types/order";
const order: SerializedOrder = { _id: "abc", title: '<script>alert("x")</script>', reference: "REF", orderDate: "2026-01-16", deliveryDate: "2026-02-02", status: "new", createdAt: "2026-01-16", updatedAt: "2026-01-16", products: [{ styleCode: "MMF1023", designName: "FA CAI", productType: "ADULTS UNISEX T-SHIRT", workFront: "ทรานสเฟอร์", workBack: "ปัก+Glow", fabricType: "ผู้ใหญ่-ผ้าตัว", variants: [{ color: "BLACK", sizes: { XS: 60, S: 85, M: 85, L: 85, XL: 85 } }], artworks: [{ caption: "Tag on Size Label", imageKey: "products/tag.webp" }] }] };
test("optional sheet fields validate dates, bounded text and trusted image references", () => {
  assert.ok(validSheetInput({ products: [{}] }));
  assert.ok(validSheetInput({ products: order.products, deliveryDate: "2026-02-02" }));
  for (const deliveryDate of ["2026-02-30", "2026-99-01", 3, {}, "tomorrow"]) assert.equal(validSheetInput({ products: [], deliveryDate }), false);
  assert.equal(validSheetInput({ products: [{ artworks: [{ caption: "tag", imageKey: "../../secret" }] }] }), false);
  assert.equal(validSheetInput({ products: [{ artworks: [{ caption: "tag", imageUrl: "http://localhost" }] }] }), false);
  assert.equal(validSheetInput({ products: [{ artworks: Array(4).fill({ caption: "tag" }) }] }), false);
  assert.equal(validSheetInput({ products: [{ fabricType: "x".repeat(121) }] }), false);
});
test("sheet escapes user text and contains Thai, artwork, totals and delivery date", () => {
  const html = orderSheetHtml(order, () => "data:image/webp;base64,AA==");
  assert.ok(!html.includes('<script>'));
  for (const text of ["&lt;script&gt;", "ทรานสเฟอร์", "ปัก+Glow", "ผู้ใหญ่-ผ้าตัว", "Tag on Size Label", "400", "กุมภาพันธ์", "2569"]) assert.ok(html.includes(text), text);
});
test("historical orders without new fields render without changes or crashes", () => {
  const old = { ...order, deliveryDate: undefined, products: order.products.map(p => ({ ...p, artworks: undefined, fabricType: undefined })) };
  assert.ok(orderSheetHtml(old).includes("กำหนดส่ง: —"));
});
test("large grids repeat headings in bounded chunks and preserve every colour and quantity", () => {
  const large = { ...order, products: [{ ...order.products[0], variants: Array.from({length:100},(_,i)=>({color:`COLOUR-${i+1}`,sizes:{XS:i+1,S:0,M:0,L:0,XL:0}})) }] };
  const html = orderSheetHtml(large);
  assert.equal((html.match(/<section class="product">/g)||[]).length,13);
  for(let i=1;i<=100;i++) assert.ok(html.includes(`>COLOUR-${i}<`));
  assert.ok(html.includes('สี 97–100 / 100'));assert.ok(html.includes('5,050'));
});
test("long printing and design text remain complete in flowing details rather than stretching table rows", () => {
  const text='ตรวจสอบแนวพิมพ์ / Check alignment.\n'.repeat(100);
  const long={...order,products:[{...order.products[0],designName:text,workFront:text,workBack:text,workRemark:text}]};
  const html=orderSheetHtml(long);
  assert.ok(html.includes('ดูรายละเอียดต่อท้ายสินค้า'));
  assert.equal(html.split(text).length-1,4);
  assert.ok(html.includes('class="details"'));
});
