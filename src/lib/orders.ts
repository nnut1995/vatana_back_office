import { listColors, assignConfiguredColors } from "@/lib/colors";
import { applyOrderColors } from "@/lib/color-config";
import { SIZES } from "./order-sizes";
import { productTypeValue } from "@/lib/product-type";
import { currentUser } from "@/lib/access";
import { ObjectId, type Collection } from "mongodb";
import { recordOrderStatusChange } from "@/lib/order-history";
import { auth } from "@/auth";
import { recordProductChange } from "@/lib/product-history";
import type { ProductionQuantities } from "@/types/order";
import { getDb } from "@/lib/mongodb";
import { 
  DEFAULT_PRODUCT_STATUS,
  type Order,
  type SerializedOrder,
  type CreateOrderInput,
  type OrderStatus,
  type ProductStatus,
  type SizeBreakdown,
  type ColorVariant,
  type WorkDetails,
  type ProductionArtwork,
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

/** Fill in any missing sizes with 0 so every variant is complete. */
function normalizeSizes(sizes: Partial<SizeBreakdown>): SizeBreakdown {
  const normalized = SIZES.reduce((acc, size) => {
    acc[size] = Number(sizes[size]) || 0;
    return acc;
  }, {} as SizeBreakdown);
  if (sizes.XXL !== undefined) normalized.XXL = Number(sizes.XXL) || 0;
  return normalized;
}

export async function listOrders(status?: OrderStatus): Promise<SerializedOrder[]> {
  const collection = await ordersCollection();
  const filter = status ? { status } : {};
  const orders = await collection
    .find(filter)
    .sort({ orderDate: -1, createdAt: -1 })
    .limit(200)
    .toArray();
  const colors = await listColors();
  return orders.map(order => applyOrderColors(serializeOrder(order), colors));
}

export async function getOrder(id: string): Promise<SerializedOrder | null> {
  if (!ObjectId.isValid(id)) return null;
  const collection = await ordersCollection();
  const order = await collection.findOne({ _id: new ObjectId(id) });
  return order ? applyOrderColors(serializeOrder(order), await listColors()) : null;
}

export async function createOrder(input: CreateOrderInput): Promise<SerializedOrder> {
  const collection = await ordersCollection();
  const now = new Date();

  const colors = await listColors();
  const products = input.products.map((p) => ({
    styleCode: p.styleCode.trim(),
    designName: p.designName.trim(),
    productType: productTypeValue(p),
    material: p.material?.trim() || undefined,
    fabricType: p.fabricType?.trim() || undefined,
    artworks: (p.artworks ?? []).map((a) => ({ caption: a.caption.trim(), ...(a.imageKey ? { imageKey: a.imageKey } : {}), ...(a.imageUrl ? { imageUrl: a.imageUrl } : {}) })),
    status: p.status ?? DEFAULT_PRODUCT_STATUS,
    workFront: p.workFront?.trim() || "",
    workBack: p.workBack?.trim() || "",
    workSleeves: p.workSleeves?.trim() || "",
    productionSteps: p.productionSteps?.trim() || "",
    workRemark: p.workRemark?.trim() || "",
    imageKey: p.imageKey?.trim() || undefined,
    imageUrl: p.imageUrl?.trim() || undefined,
    variants: assignConfiguredColors(p.variants.map(
      (v): ColorVariant => ({
        color: v.color.trim(),
        colorId: v.colorId,
        sizes: normalizeSizes(v.sizes),
      }),
    ), colors),
  }));

  const order: Omit<Order, "_id"> = {
    title: input.title.trim(),
    reference:
      input.reference?.trim() ||
      `ORD-${now.getFullYear()}-${now.getTime().toString().slice(-6)}`,
    orderDate: input.orderDate ? new Date(input.orderDate) : now,
    deliveryDate: input.deliveryDate || undefined,
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

export async function updateProductWorkDetails(id: string, index: number, details: WorkDetails & { artworks?: ProductionArtwork[] }, requestId?: string) {
  const ok = await recordProductChange(await ordersCollection(), id, index,
    await auditActor(), "work_details", details, undefined, "", requestId);
  return { ok };
}

export async function updateProductStatus(
  id: string, index: number, status: ProductStatus, productionNotes?: string,
  quantities?: ProductionQuantities, note = "", requestId?: string,
): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  return recordProductChange(await ordersCollection(), id, index, user.email,
    "production", {
      status,
      ...(productionNotes !== undefined ? { productionNotes: productionNotes.trim() } : {}),
    }, quantities, note.trim(), requestId, user.role === "admin" ? undefined : user.departments);
}

export async function updateOrderStatus(
  id: string, status: OrderStatus, requestId?: string,
): Promise<boolean> {
  return recordOrderStatusChange(await ordersCollection(), id, status, await auditActor(), requestId);
}
