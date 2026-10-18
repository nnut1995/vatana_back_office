import { ALL_SIZES, CHILD_SIZES, SIZES } from "./order-sizes";
import {  type Size } from "../types/order";
import { productTypeValue } from "./product-type";

export const CHILD_SIZE_NUMBERS: Partial<Record<Size, number>> = { S: 4, M: 6, L: 8, XL: 10, XXL: 12 };
type SizedProduct = { productType?: string; fabricType?: string; variants?: { sizes?: Partial<Record<Size, number | string>> }[] };
export function isChildShirt(product: SizedProduct): boolean {
  return /เด็ก|\b(?:kids?|child(?:ren)?)\b/i.test(productTypeValue(product));
}
/** Retain nonzero historical quantities outside the current garment's standard columns. */
export function sizeColumns(product: SizedProduct): Size[] {
  const standard: readonly Size[] = isChildShirt(product) ? CHILD_SIZES : SIZES;
  return ALL_SIZES.filter(size => standard.includes(size) || product.variants?.some(v => Number(v.sizes?.[size]) > 0));
}
export function sizeLabel(product: SizedProduct, size: Size): string {
  return isChildShirt(product) && CHILD_SIZE_NUMBERS[size] ? `${size} / ${CHILD_SIZE_NUMBERS[size]}` : size;
}
