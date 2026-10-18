import { parseArtworks } from "./artworks";

/** Validate optional sheet fields without requiring a migration for old orders. */
export function validSheetInput(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  for (const field of ["orderDate", "deliveryDate"] as const) {
    const date = input[field];
    if (date !== undefined && date !== "" && (typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date)) return false;
  }
  if (!Array.isArray(input.products)) return false;
  return input.products.every((product) => {
    if (!product || typeof product !== "object") return false;
    if (product.fabricType !== undefined && (typeof product.fabricType !== "string" || product.fabricType.length > 120)) return false;
    if (product.artworks === undefined) return true;
    return parseArtworks(product.artworks) !== null;
  });
}
