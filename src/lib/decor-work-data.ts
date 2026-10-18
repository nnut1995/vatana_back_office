import { ObjectId, type Collection, type UpdateFilter } from "mongodb";
import { productStatus, type DecorWorkEntry, type DecorWorkInput, type Order } from "@/types/order";
import { decorQuantities, DECOR_STEPS } from "@/lib/decor-work";
import { resolveVariantColor, type ConfiguredColor } from "@/lib/color-config";
import { getDb } from "@/lib/mongodb";

export async function listDecorSteps(): Promise<string[]> {
  const saved = await (await getDb()).collection<Order>("orders").distinct("products.decorWork.step");
  return [...new Set<string>([...DECOR_STEPS, ...saved.filter((s): s is string => typeof s === "string" && !!s.trim())])];
}

/** Share the product revision with stage/variant edits; retries never count twice. */
export async function recordDecorWork(collection: Collection<Order>, id: string, index: number,
  actor: string, input: DecorWorkInput, requestId: string, colors: ConfiguredColor[] = []): Promise<boolean> {
  if (!ObjectId.isValid(id) || !Number.isSafeInteger(index) || index < 0) return false;
  const _id = new ObjectId(id);
  for (let attempt = 0; attempt < 5; attempt++) {
    const order = await collection.findOne({ _id });
    const product = order?.products[index];
    if (!product || order?.status === "cancelled") return false;
    if (product.decorWork?.some(e => e.id === requestId && e.actor === actor)) return true;
    if (productStatus(product) !== "decor") return false;
    const entry: DecorWorkEntry = { ...input, quantities: decorQuantities({ ...product, variants: product.variants.map(v => resolveVariantColor(v, colors)) }, input),
      id: requestId, at: new Date().toISOString(), actor };
    const prefix = `products.${index}`;
    const result = await collection.updateOne({ _id, status: { $ne: "cancelled" },
      [`${prefix}.status`]: "decor", [`${prefix}.revision`]: product.revision ?? { $exists: false },
    }, { $set: { updatedAt: new Date() }, $inc: { [`${prefix}.revision`]: 1 },
      $push: { [`${prefix}.decorWork`]: entry },
    } as UpdateFilter<Order>);
    if (result.matchedCount) return true;
  }
  throw new Error("มีการบันทึกพร้อมกัน กรุณาลองอีกครั้ง");
}
