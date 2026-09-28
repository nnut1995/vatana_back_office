import { PRODUCT_STATUSES, type ProductStatus, type ProductionQuantities } from "@/types/order";

export interface ProductionReportEntry {
  id: string;
  orderId: string;
  reference: string;
  styleCode: string;
  designName: string;
  at: string;
  actor: string;
  department: ProductStatus;
  quantities: ProductionQuantities;
  note: string;
}

export function bangkokDate(date = new Date()): string {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Inclusive calendar dates in Bangkok, regardless of the browser's timezone. */
export function filterProductionEntries(entries: ProductionReportEntry[], start: string, end: string, department: string) {
  const from = start ? Date.parse(`${start}T00:00:00+07:00`) : -Infinity;
  const until = end ? Date.parse(`${end}T23:59:59.999+07:00`) : Infinity;
  return entries.filter(e => {
    const time = Date.parse(e.at);
    return Number.isFinite(time) && time >= from && time <= until && (!department || e.department === department);
  });
}

export function summarizeProduction(entries: ProductionReportEntry[]) {
  return PRODUCT_STATUSES.map(department => {
    const matching = entries.filter(e => e.department === department);
    const totals = matching.reduce((sum, e) => ({
      received: sum.received + e.quantities.received,
      sent: sum.sent + e.quantities.sent,
      defective: sum.defective + e.quantities.defective,
    }), { received: 0, sent: 0, defective: 0 });
    const processed = totals.sent + totals.defective;
    return { department, records: matching.length, ...totals, processed,
      defectRate: processed ? totals.defective / processed * 100 : 0 };
  });
}
