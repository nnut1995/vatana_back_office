/** Shared runtime values with no imports or server/client dependencies. */
export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export const CHILD_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof ALL_SIZES)[number];
export type SizeBreakdown = Record<(typeof SIZES)[number], number> & { XXL?: number };

/** Initialize inside the same module as the values, including the child XXL slot. */
export function emptySizeInputs(): Record<Size, string> {
  return Object.fromEntries(ALL_SIZES.map(size => [size, ""])) as Record<Size, string>;
}
