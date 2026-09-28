import { PRODUCT_STATUSES, productStatus, type OrderProduct } from "@/types/order";

/** Per-product totals of department work records, never inferred from ordered units. */
export function productStageSummary(product: OrderProduct) {
  return PRODUCT_STATUSES.map(stage => {
    const entries = (product.history ?? []).filter(e => e.kind === "production" && e.to === stage && e.quantities);
    const totals = entries.reduce((sum, e) => ({
      received: sum.received + e.quantities!.received,
      sent: sum.sent + e.quantities!.sent,
      defective: sum.defective + e.quantities!.defective,
    }), { received: 0, sent: 0, defective: 0 });
    return { stage, current: productStatus(product) === stage, records: entries.length,
      ...totals, remaining: totals.received - totals.sent - totals.defective };
  });
}
