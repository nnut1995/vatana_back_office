import { ObjectId, type Collection, type UpdateFilter } from "mongodb";
import { randomUUID } from "node:crypto";
import { productFinishings, productStatus, type Order, type OrderProduct, type ProductionQuantities, type ProductHistoryEntry } from "@/types/order";

export function validQuantities(value: unknown): value is ProductionQuantities {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const q = value as ProductionQuantities;
  return [q.received, q.sent, q.defective].every(n => Number.isSafeInteger(n) && n >= 0)
    && q.received > 0 && q.sent <= q.received && q.defective <= q.received - q.sent;
}

export type ProductPatch = Partial<Pick<OrderProduct, "status" | "productionNotes" | "imageKey" | "finishings">>;

/** State and its append-only audit entry commit in ONE atomic document update. */
export async function recordProductChange(
  collection: Collection<Order>, id: string, index: number, actor: string,
  kind: ProductHistoryEntry["kind"], patch: ProductPatch,
  quantities?: ProductionQuantities, note = "", requestId: string = randomUUID(),
): Promise<boolean> {
  if (!ObjectId.isValid(id) || !Number.isInteger(index) || index < 0) return false;
  if (quantities && !validQuantities(quantities)) throw new Error("จำนวนผลิตไม่ถูกต้อง");
  const _id = new ObjectId(id);
  for (let attempt = 0; attempt < 5; attempt++) {
    const order = await collection.findOne({ _id }, { projection: { products: 1 } });
    const product = order?.products[index];
    if (!product) return false;
    if (product.history?.some(e => e.id === requestId)) return true;
    const before: ProductPatch = {};
    for (const key of Object.keys(patch) as (keyof ProductPatch)[]) {
      Object.assign(before, { [key]: key === "finishings" ? productFinishings(product) : product[key] ?? "" });
    }
    const entry: ProductHistoryEntry = {
      id: requestId, at: new Date().toISOString(), actor, kind,
      from: productStatus(product), to: patch.status ?? productStatus(product),
      before, after: patch, quantities, note,
    };
    const prefix = `products.${index}`;
    const fields = Object.fromEntries(Object.entries(patch).map(([key, value]) => [`${prefix}.${key}`, value]));
    const result = await collection.updateOne({
      _id,
      [`${prefix}.revision`]: product.revision ?? { $exists: false },
    }, {
      $set: { ...fields, updatedAt: new Date() },
      $inc: { [`${prefix}.revision`]: 1 },
      $push: { [`${prefix}.history`]: entry },
      ...(patch.finishings !== undefined ? { $unset: { [`${prefix}.instructions`]: "" } } : {}),
    } as UpdateFilter<Order>);
    if (result.matchedCount) return true;
  }
  throw new Error("มีการแก้ไขพร้อมกัน กรุณาลองอีกครั้ง");
}
