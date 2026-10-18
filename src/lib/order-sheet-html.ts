import { validColorHex, colorText } from "./color-config";
import { ALL_SIZES } from "./order-sizes";
import { sizeColumns, isChildShirt, CHILD_SIZE_NUMBERS } from "./size-columns";
import { productTypeValue, legacyProductType } from "./product-type";
import {  variantTotal, orderTotal, type OrderProduct, type SerializedOrder } from "../types/order";

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const number = (n: number) => n.toLocaleString("en-US");
const date = (value?: string) => value ? new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";
const extended = (text?: string) => Boolean(text && (text.length > 180 || text.split("\n").length > 4));

/** Image resolver receives only stored references. The server supplies embedded bytes. */
export function orderSheetHtml(order: SerializedOrder, image: (key?: string, url?: string) => string = () => ""): string {
  const photo = (key: string | undefined, url: string | undefined, alt: string) => {
    const src = image(key, url);
    return src ? `<img src="${escape(src)}" alt="${escape(alt)}">` : `<div class="no-image">${escape(alt)}</div>`;
  };
  const shirtType = (p: OrderProduct) => `<span>${escape(productTypeValue(p) || "—")}</span>`;
  const printing = (p: OrderProduct) => [["หน้า", p.workFront], ["หลัง", p.workBack], ["แขน", p.workSleeves]]
    .filter(([label, text]) => label !== "แขน" || text)
    .map(([label, text]) => `${label}: ${extended(text) ? "ดูรายละเอียดต่อท้ายสินค้า" : escape(text)}`).join("<br>");
  const product = (p: OrderProduct) => {
    const columns = sizeColumns(p);
    // Repeat the SKU, size headings and artwork on every bounded continuation.
    const chunkSize = p.variants.length > 12 ? 8 : Math.max(1, p.variants.length);
    const chunks = Array.from({ length: Math.max(1, Math.ceil(p.variants.length / chunkSize)) }, (_, i) => p.variants.slice(i * chunkSize, (i + 1) * chunkSize));
    const longName = p.designName.length > 80;
    const blocks = chunks.map((variants, index) => `<section class="product"><div class="garment">${photo(p.imageKey, p.imageUrl, p.styleCode)}<div>${escape(productTypeValue(p))}</div>${p.material ? `<div>${escape(p.material)}</div>` : ""}</div><div class="middle"><table class="quantities"><thead><tr><th>${escape(p.styleCode)}</th>${columns.map(s => `<th rowspan="2">${s}${isChildShirt(p) && CHILD_SIZE_NUMBERS[s] ? `<br>${CHILD_SIZE_NUMBERS[s]}` : ""}</th>`).join("")}<th rowspan="2">TOTAL</th></tr><tr><th>${longName ? "ชื่อลาย: ดูรายละเอียดด้านล่าง" : escape(p.designName)}${chunks.length > 1 ? `<div class="continuation">สี ${index * chunkSize + 1}–${index * chunkSize + variants.length} / ${p.variants.length}</div>` : ""}</th></tr></thead><tbody>${variants.map(v => {
      const c = validColorHex(v.colorHex) ? [v.colorHex, colorText(v.colorHex)] : undefined;
      return `<tr><td${c ? ` style="background:${c[0]};color:${c[1]}"` : ""}>${escape(v.color)}</td>${columns.map(s => `<td>${number(v.sizes[s] || 0)}</td>`).join("")}<td>${number(variantTotal(v))}</td></tr>`;
    }).join("")}</tbody></table>${(p.artworks ?? []).some(a => a.imageKey || a.imageUrl) ? `<div class="artworks">${(p.artworks ?? []).filter(a => a.imageKey || a.imageUrl).map(a => `<figure>${photo(a.imageKey, a.imageUrl, a.caption)}<figcaption>${escape(a.caption)}</figcaption></figure>`).join("")}</div>` : ""}</div><table class="printing"><thead><tr><th>วิธีพิมพ์</th><th class="fabric">ประเภทเสื้อ</th></tr></thead><tbody><tr><td>${printing(p)}</td><td class="fabric">${shirtType(p)}</td></tr></tbody></table></section>`).join("");
    const fields: [string, string | undefined][] = [
      ...(p.artworks ?? []).filter(a => !a.imageKey && !a.imageUrl && a.caption.trim()).map(a => ["รูปประกอบ (ข้อความ)", a.caption] as [string, string]),
      ["ชื่อลาย", longName ? p.designName : undefined],
      ["ประเภทเสื้อเดิมจากอีกช่อง", legacyProductType(p)],
      ["วิธีพิมพ์หน้า", extended(p.workFront) ? p.workFront : undefined],
      ["วิธีพิมพ์หลัง", extended(p.workBack) ? p.workBack : undefined],
      ["วิธีพิมพ์แขน", extended(p.workSleeves) ? p.workSleeves : undefined],
      ["ขั้นตอนการผลิต", p.productionSteps], ["หมายเหตุงาน", p.workRemark], ["รายละเอียดการผลิต", p.productionNotes],
    ];
    const populated = fields.filter(([, value]) => value);
    return blocks + (populated.length ? `<section class="details"><h2>${escape(p.styleCode)} — รายละเอียดเพิ่มเติม</h2>${populated.map(([label, text]) => extended(text) ? `<div class="detail-field"><h3>${label}</h3><p>${escape(text)}</p></div>` : `<div class="compact-field"><b>${label}:</b> ${escape(text)}</div>`).join("")}</section>` : "");
  };
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escape(order.reference)}</title><style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #000; font: 11px Arial, Tahoma, sans-serif; }
    header { display: flex; justify-content: space-between; align-items: end; margin-bottom: 3mm; }
    h1 { font-size: 19px; font-weight: normal; margin: 0; overflow-wrap: anywhere; } .date { font-size: 16px; } .meta { font-size: 10px; }
    .product { display: grid; grid-template-columns: 14% 64% 20%; gap: 1%; margin-bottom: 3mm; break-inside: avoid; }
    .garment { text-align: center; display: flex; flex-direction: column; justify-content: center; gap: 3px; overflow-wrap: anywhere; }
    img { object-fit: contain; max-width: 100%; } .garment img { width: 100%; height: 28mm; }
    .no-image { min-height: 15mm; display: grid; place-content: center; color: #777; border: 1px dashed #ddd; }
    .middle { display: flex; align-items: stretch; } table { border-collapse: collapse; table-layout: fixed; width: 100%; }
    td, th { border: .25mm solid black; padding: 3px; text-align: center; font-weight: normal; overflow-wrap: anywhere; }
    tr { break-inside: avoid; } .quantities { flex: 1; min-width: 0; } .quantities th:first-child { width: 28%; } .quantities th:last-child { width: 14%; }
    .quantities tbody td { height: 8mm; } .continuation { font-size: 9px; font-weight: bold; }
    .artworks { display: flex; border: .25mm solid black; border-left: 0; max-width: 38%; }
    figure { margin: 0; padding: 3px; width: 22mm; display: flex; flex-direction: column; justify-content: center; text-align: center; }
    figure img { width: 100%; height: 25mm; } figcaption { font-size: 8px; margin-top: 3px; overflow-wrap: anywhere; }
    .printing th { background: #eee; } .printing td { text-align: left; white-space: pre-wrap; } .fabric { background: #e4efd9; text-align: center !important; }
    .selected { display: inline-block; border: 1px solid #c33; border-radius: 50%; padding: 3px; }
    .details { margin: 0 0 3mm 14%; font-size: 10px; overflow-wrap: anywhere; }
    .details h2 { font-size: 11px; margin: 0 0 1mm; break-after: avoid; } .details h3 { font-size: 10px; margin: 1mm 0; break-after: avoid; }
    .compact-field { white-space: pre-wrap; margin-bottom: 1mm; }
    .details p { white-space: pre-wrap; margin: 0 0 2mm; orphans: 2; widows: 2; }
    .total-size { display: block; font-size: 8px; color: #555; } footer { margin-left: 14%; break-inside: avoid; } footer table { width: 64%; font-weight: bold; } footer td { border: 0; } footer td:first-child { width: 28%; }
    .notes { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 10px; margin-top: 3mm; orphans: 2; widows: 2; }
  </style></head><body><header><div><h1>${escape(order.title)}</h1><div class="date">NEW ORDER: ${escape(new Date(order.orderDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).toUpperCase())}</div><span class="meta">${escape(order.reference)}</span></div><div>กำหนดส่ง: ${escape(date(order.deliveryDate) || "—")}</div></header>
  ${order.products.map(product).join("")}
  <footer><table><tr><td>รวมทั้งหมด</td>${ALL_SIZES.filter(s => order.products.some(p => sizeColumns(p).includes(s))).map(s => `<td><span class="total-size">${s}</span>${number(order.products.reduce((n,p) => n + p.variants.reduce((a,v) => a + (v.sizes[s] || 0), 0), 0))}</td>`).join("")}<td>${number(orderTotal(order))}</td></tr></table></footer>${order.notes ? `<div class="notes">หมายเหตุคำสั่งซื้อ: ${escape(order.notes)}</div>` : ""}</body></html>`;
}
