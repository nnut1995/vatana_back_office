import { ObjectId, type Collection, type UpdateFilter } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  SIZES,
  productFinishings,
  type Order,
  type SerializedOrder,
  type CreateOrderInput,
  type OrderStatus,
  type SizeBreakdown,
  type ColorVariant,
  type Finishing,
} from "@/types/order";

async function ordersCollection(): Promise<Collection<Order>> {
  const db = await getDb();
  return db.collection<Order>("orders");
}

export function serializeOrder(order: Order): SerializedOrder {
  return {
    ...order,
    _id: order._id.toString(),
    orderDate: order.orderDate.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

/**
 * Trim a finishing list coming from a client, dropping rows that carry neither
 * a description nor a photo.
 */
export function normalizeFinishings(finishings: Finishing[] = []): Finishing[] {
  return finishings
    .map((f) => ({
      description: (f.description ?? "").trim(),
      imageKey: f.imageKey?.trim() || undefined,
      imageUrl: f.imageUrl?.trim() || undefined,
    }))
    .filter((f) => f.description || f.imageKey || f.imageUrl);
}

/** Fill in any missing sizes with 0 so every variant is complete. */
function normalizeSizes(sizes: Partial<SizeBreakdown>): SizeBreakdown {
  return SIZES.reduce((acc, size) => {
    acc[size] = Number(sizes[size]) || 0;
    return acc;
  }, {} as SizeBreakdown);
}

export async function listOrders(status?: OrderStatus): Promise<SerializedOrder[]> {
  const collection = await ordersCollection();
  const filter = status ? { status } : {};
  const orders = await collection
    .find(filter)
    .sort({ orderDate: -1, createdAt: -1 })
    .limit(200)
    .toArray();
  return orders.map(serializeOrder);
}

export async function getOrder(id: string): Promise<SerializedOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await ordersCollection();
  const order = await collection.findOne({ _id: new ObjectId(id) });
  return order ? serializeOrder(order) : null;
}

export async function createOrder(input: CreateOrderInput): Promise<SerializedOrder> {
  const collection = await ordersCollection();
  const now = new Date();

  const products = input.products.map((p) => ({
    styleCode: p.styleCode.trim(),
    designName: p.designName.trim(),
    productType: (p.productType || "ADULTS UNISEX T-SHIRT").trim(),
    material: p.material?.trim() || undefined,
    finishings: normalizeFinishings(p.finishings),
    imageKey: p.imageKey?.trim() || undefined,
    imageUrl: p.imageUrl?.trim() || undefined,
    variants: p.variants.map(
      (v): ColorVariant => ({
        color: v.color.trim(),
        sizes: normalizeSizes(v.sizes),
      }),
    ),
  }));

  const order: Omit<Order, "_id"> = {
    title: input.title.trim(),
    reference:
      input.reference?.trim() ||
      `ORD-${now.getFullYear()}-${now.getTime().toString().slice(-6)}`,
    orderDate: input.orderDate ? new Date(input.orderDate) : now,
    status: "new",
    products,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(order as Order);
  return serializeOrder({ ...order, _id: result.insertedId } as Order);
}

/**
 * Set (or clear, with `imageKey: null`) the photo of one product within an
 * order, addressed by its position in the products array.
 *
 * Returns the key that was previously stored so the caller can delete the
 * now-orphaned object from S3.
 */
export async function updateProductImage(
  id: string,
  index: number,
  imageKey: string | null,
): Promise<{ ok: boolean; previousKey?: string }> {
  if (!ObjectId.isValid(id) || !Number.isInteger(index) || index < 0) {
    return { ok: false };
  }

  const collection = await ordersCollection();
  const _id = new ObjectId(id);
  const order = await collection.findOne({ _id }, { projection: { products: 1 } });
  if (!order || index >= order.products.length) return { ok: false };

  const field = `products.${index}.imageKey`;
  const update = (
    imageKey
      ? { $set: { [field]: imageKey, updatedAt: new Date() } }
      : { $unset: { [field]: "" }, $set: { updatedAt: new Date() } }
  ) as UpdateFilter<Order>;

  await collection.updateOne({ _id }, update);
  return { ok: true, previousKey: order.products[index].imageKey };
}

/**
 * Replace the finishing list of one product within an order, addressed by its
 * position in the products array.
 *
 * Returns the photo keys the product used to reference and no longer does, so
 * the caller can delete the now-orphaned objects from S3.
 */
export async function updateProductFinishings(
  id: string,
  index: number,
  finishings: Finishing[],
): Promise<{ ok: boolean; orphanedKeys: string[] }> {
  if (!ObjectId.isValid(id) || !Number.isInteger(index) || index < 0) {
    return { ok: false, orphanedKeys: [] };
  }

  const collection = await ordersCollection();
  const _id = new ObjectId(id);
  const order = await collection.findOne({ _id }, { projection: { products: 1 } });
  if (!order || index >= order.products.length) {
    return { ok: false, orphanedKeys: [] };
  }

  const next = normalizeFinishings(finishings);
  const keptKeys = new Set(next.map((f) => f.imageKey).filter(Boolean));
  const orphanedKeys = productFinishings(order.products[index])
    .map((f) => f.imageKey)
    .filter((key): key is string => Boolean(key) && !keptKeys.has(key));

  await collection.updateOne({ _id }, {
    $set: { [`products.${index}.finishings`]: next, updatedAt: new Date() },
    // The legacy text-only list is superseded once finishings are written.
    $unset: { [`products.${index}.instructions`]: "" },
  } as UpdateFilter<Order>);

  return { ok: true, orphanedKeys };
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await ordersCollection();
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
  );
  return result.matchedCount > 0;
}
