/** A garment type can be a suggestion or a custom label. */
export function parseProductType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= 120 ? text : null;
}

/** One shirt-type concept; old fabricType is a read fallback, never discarded. */
export function productTypeValue(product: { productType?: string; fabricType?: string }): string {
  return (typeof product.productType === "string" ? product.productType.trim() : "") ||
    (typeof product.fabricType === "string" ? product.fabricType.trim() : "");
}

/** Different legacy values need an explicit choice rather than a guessed merge. */
export function legacyProductType(product: { productType?: string; fabricType?: string }): string | undefined {
  const legacy = typeof product.fabricType === "string" ? product.fabricType.trim() : "";
  return legacy && legacy !== productTypeValue(product) ? legacy : undefined;
}
