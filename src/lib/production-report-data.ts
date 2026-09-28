import { getDb } from "@/lib/mongodb";
import type { Order } from "@/types/order";
import type { ProductionReportEntry } from "@/lib/production-report";

/** Include historical work even after an order is completed or cancelled. */
export async function listProductionReportEntries(): Promise<ProductionReportEntry[]> {
  const db = await getDb();
  return db.collection<Order>("orders").aggregate<ProductionReportEntry>([
    { $unwind: "$products" },
    { $unwind: "$products.history" },
    { $match: { "products.history.kind": "production", "products.history.quantities.received": { $gt: 0 } } },
    { $project: { _id: 0, id: "$products.history.id", orderId: { $toString: "$_id" },
      reference: "$reference", styleCode: "$products.styleCode", designName: "$products.designName",
      at: "$products.history.at", actor: "$products.history.actor", department: "$products.history.to",
      quantities: "$products.history.quantities", note: "$products.history.note" } },
    { $sort: { at: -1, orderId: 1, id: 1 } },
  ]).toArray();
}
