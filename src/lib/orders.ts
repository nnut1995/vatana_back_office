import { ObjectId, type Collection } from "mongodb";
import { auth } from "@/auth";
import { recordProductChange } from "@/lib/product-history";
import type { ProductionQuantities } from "@/types/order";
import { getDb } from "@/lib/mongodb";
import {
  SIZES,
  DEFAULT_PRODUCT_STATUS,
  type Order,
  type SerializedOrder,
  type CreateOrderInput,
  type OrderStatus,
  type ProductStatus,
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
    productType: (p.productType || "เสื้อยืดผู้ใหญ่ ยูนิเซ็กซ์").trim(),
    material: p.material?.trim() || undefined,
    status: p.status ?? DEFAULT_PRODUCT_STATUS,
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

async function auditActor(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("กรุณาเข้าสู่ระบบ");
  return session.user.email || session.user.name || "ผู้ใช้ที่เข้าสู่ระบบ";
}

export async function updateProductImage(id: string, index: number, imageKey: string | null) {
  const ok = await recordProductChange(await ordersCollection(), id, index,
    await auditActor(), "image", { imageKey: imageKey ?? "" });
  return { ok };
}

export async function updateProductFinishings(id: string, index: number, finishings: Finishing[]) {
  const ok = await recordProductChange(await ordersCollection(), id, index,
    await auditActor(), "finishings", { finishings: normalizeFinishings(finishings) });
  return { ok };
}

export async function updateProductStatus(
  id: string, index: number, status: ProductStatus, productionNotes?: string,
  quantities?: ProductionQuantities, note = "", requestId?: string,
): Promise<boolean> {
  return recordProductChange(await ordersCollection(), id, index, await auditActor(),
    "production", {
      status,
      ...(productionNotes !== undefined ? { productionNotes: productionNotes.trim() } : {}),
    }, quantities, note.trim(), requestId);
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
