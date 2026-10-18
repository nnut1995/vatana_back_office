import { ALL_SIZES } from "./order-sizes";
import {  type ColorVariant } from '@/types/order';
export function parseVariants(value: unknown): ColorVariant[] {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('กรุณาระบุสีอย่างน้อย 1 รายการ และไม่เกิน 100 รายการ');
  const colors = new Set<string>();
  let total = 0;
  return value.map(v => {
    if (!v || typeof v.color !== 'string' || !v.color.trim() || v.color.trim().length > 100) throw new Error('กรุณาระบุชื่อสีไม่เกิน 100 ตัวอักษร');
    const color = v.color.trim();
    if (colors.has(color.toLowerCase())) throw new Error('ชื่อสีซ้ำ กรุณารวมจำนวนในแถวเดียวกัน');
    colors.add(color.toLowerCase());
    const sizes = {} as ColorVariant['sizes'];
    for (const size of ALL_SIZES) {
      const amount = v.sizes?.[size];
      if (size === 'XXL' && amount === undefined) continue;
      if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('จำนวนแต่ละไซซ์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป');
      total += amount;
      if (!Number.isSafeInteger(total)) throw new Error('จำนวนรวมมากเกินไป');
      sizes[size] = amount;
    }
    if (v.colorId !== undefined && (typeof v.colorId !== 'string' || !/^[0-9a-f]{24}$/i.test(v.colorId))) throw new Error('สีที่เลือกไม่ถูกต้อง');
    return { color, sizes, ...(v.colorId ? { colorId: v.colorId } : {}) };
  });
}
