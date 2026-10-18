import type { ProductHistoryEntry, ProductStatus } from "@/types/order";

/** Follow actual work history, including skipped departments, rather than enum order. */
export function previousStageOutput(history: ProductHistoryEntry[], target: ProductStatus) {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.kind === "production" && entry.to !== target && entry.quantities) {
      return { stage: entry.to, sent: entry.quantities.sent };
    }
  }
  return undefined;
}
