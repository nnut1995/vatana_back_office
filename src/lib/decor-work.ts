import { ALL_SIZES, type Size, type SizeBreakdown } from "./order-sizes";
import type { DecorWorkEntry, DecorWorkInput, OrderProduct } from "../types/order";

export const DECOR_STEPS = ["ติดหน้า", "รีดหน้า", "ติดหลัง", "รีดหลัง", "ติดแขน", "รีดแขน", "พิมพ์คอ", "ดึงป้าย"] as const;
export const DECOR_PERIODS = { morning: "เช้า", afternoon: "บ่าย", ot: "OT" } as const;

export function decorDone(product: OrderProduct, step: string, color: string, size: Size, colorId?: string): number {
  return (product.decorWork ?? []).filter(entry => entry.step === step)
    .reduce((sum, entry) => sum + entry.quantities.filter(q => colorId && q.colorId ? q.colorId === colorId : q.color === color)
      .reduce((subtotal, q) => subtotal + (q.sizes[size] ?? 0), 0), 0);
}

export function parseDecorWork(value: unknown): DecorWorkInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("ข้อมูลไม่ถูกต้อง");
  const body = value as Record<string, unknown>;
  const text = (key: string, max: number) => {
    const value = body[key];
    if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`กรุณาระบุ ${key === "employee" ? "ชื่อผู้ทำงาน" : "ขั้นตอน"} ไม่เกิน ${max} ตัวอักษร`);
    return value.trim();
  };
  const employee = text("employee", 120);
  const step = text("step", 100);
  if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isFinite(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0, 10) !== body.date) throw new Error("วันที่ไม่ถูกต้อง");
  if (body.period !== "morning" && body.period !== "afternoon" && body.period !== "ot") throw new Error("เลือกช่วง เช้า บ่าย หรือ OT");
  if (!Array.isArray(body.quantities) || !body.quantities.length || body.quantities.length > 100) throw new Error("กรุณาระบุจำนวนที่ทำ");
  const seen = new Set<number>();
  let total = 0;
  const quantities = body.quantities.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("จำนวนไม่ถูกต้อง");
    const q = value as Record<string, unknown>;
    if (!Number.isSafeInteger(q.variantIndex) || (q.variantIndex as number) < 0 || seen.has(q.variantIndex as number)) throw new Error("สีไม่ถูกต้องหรือซ้ำกัน");
    seen.add(q.variantIndex as number);
    if (typeof q.color !== "string" || !q.color.trim() || q.color.length > 100) throw new Error("สีไม่ถูกต้อง");
    if (!q.sizes || typeof q.sizes !== "object" || Array.isArray(q.sizes)) throw new Error("ไซซ์ไม่ถูกต้อง");
    const sizes: Partial<SizeBreakdown> = {};
    for (const [size, count] of Object.entries(q.sizes)) {
      if (!ALL_SIZES.includes(size as Size) || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป");
      if (count) sizes[size as Size] = count;
      total += count;
    }
    if (q.colorId !== undefined && (typeof q.colorId !== "string" || !/^[0-9a-f]{24}$/i.test(q.colorId))) throw new Error("รหัสสีไม่ถูกต้อง");
    return { variantIndex: q.variantIndex as number, color: q.color, ...(q.colorId ? { colorId: q.colorId as string } : {}), sizes };
  });
  if (!Number.isSafeInteger(total) || !total) throw new Error("กรุณาระบุจำนวนที่ทำอย่างน้อย 1 ตัว");
  return { employee, step, date: body.date, period: body.period, quantities };
}

export function decorQuantities(product: OrderProduct, input: DecorWorkInput): DecorWorkEntry["quantities"] {
  return input.quantities.map(q => {
    const variant = product.variants[q.variantIndex];
    if (!variant || (q.colorId ? variant.colorId !== q.colorId : variant.color !== q.color)) throw new Error("ไม่พบสีที่เลือก กรุณาโหลดงานใหม่");
    return { ...q, color: variant.color, ...(variant.colorId ? { colorId: variant.colorId } : {}) };
  }).filter(q => Object.values(q.sizes).some(n => n > 0));
}
