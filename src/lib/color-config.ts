import type { ColorVariant, SerializedOrder } from "../types/order";

export interface ConfiguredColor { id: string; name: string; hex: string }
export function parseColorInput(value: unknown): { name: string; hex: string; nameKey: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("ข้อมูลสีไม่ถูกต้อง");
  const input = value as Record<string, unknown>;
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 100) throw new Error("กรุณาระบุชื่อสีไม่เกิน 100 ตัวอักษร");
  if (typeof input.hex !== "string" || !/^#[0-9a-f]{6}$/i.test(input.hex.trim())) throw new Error("กรุณาระบุรหัสสี HEX เช่น #1E293B");
  return { name: input.name.trim(), nameKey: input.name.trim().toLowerCase(), hex: input.hex.trim().toUpperCase() };
}
export function validColorHex(value: unknown): value is string { return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value); }
export function colorText(hex: string): string {
  if (!validColorHex(hex)) return "#000000";
  const channels = [1, 3, 5].map(i => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return luminance > 0.179 ? "#000000" : "#FFFFFF";
}
export function resolveVariantColor(variant: ColorVariant, colors: ConfiguredColor[]): ColorVariant {
  const color = variant.colorId ? colors.find(c => c.id === variant.colorId) : colors.find(c => c.name.toLowerCase() === variant.color.trim().toLowerCase());
  return color ? { ...variant, colorId: color.id, color: color.name, colorHex: color.hex } : variant;
}
/** Resolve current catalog values for display while leaving audit snapshots intact. */
export function applyOrderColors(order: SerializedOrder, colors: ConfiguredColor[]): SerializedOrder {
  return { ...order, products: order.products.map(product => ({ ...product, variants: product.variants.map(v => resolveVariantColor(v, colors)) })) };
}
