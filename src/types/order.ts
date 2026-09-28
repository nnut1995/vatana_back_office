import type { ObjectId } from "mongodb";

export const ORDER_STATUSES = [
  "new",
  "in_production",
  "shipped",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "ใหม่",
  in_production: "กำลังผลิต",
  shipped: "จัดส่งแล้ว",
  completed: "เสร็จสมบูรณ์",
  cancelled: "ยกเลิก",
};

/** Available production stages. Products may skip departments as needed. */
export const PRODUCT_STATUSES = [
  "sample",
  "wait_for_approval",
  "fabric_preparation",
  "printing",
  "decor",
  "sewing",
  "special_work",
  "finishing",
  "folding",
  "packing",
  "sent",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  sample: "ทำตัวอย่าง",
  wait_for_approval: "รออนุมัติ",
  fabric_preparation: "จัดผ้า",
  printing: "พิมพ์",
  decor: "แผนกตกแต่ง",
  sewing: "เย็บ",
  special_work: "งานพิเศษอื่น ๆ",
  finishing: "ตกแต่งขั้นสุดท้าย",
  folding: "พับ",
  packing: "บรรจุ",
  sent: "ส่งแล้ว",
};

/** Where a SKU starts, and what orders written before statuses fall back to. */
export const DEFAULT_PRODUCT_STATUS: ProductStatus = "sample";

/** Fixed size columns, matching the production sheet. */
export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];
export type SizeBreakdown = Record<Size, number>;

/** Default finishing descriptions offered on a new product row. */
export const DEFAULT_INSTRUCTIONS = [
  "พิมพ์ลาย",
  "ติดป้ายที่ป้ายขนาด",
  "ติดสติกเกอร์บนเสื้อ",
  "ติดสติกเกอร์บนเสื้อ",
];

/** Anything that can carry a photo: an uploaded key, or an external URL. */
export interface ImageRef {
  /** S3 object key of an uploaded photo, e.g. "products/<uuid>.webp". */
  imageKey?: string;
  /** Externally hosted photo. Only used when there is no uploaded `imageKey`. */
  imageUrl?: string;
}

/**
 * One finishing step on a product — a reference photo plus what to do with it.
 * A product can carry as many of these as the job needs.
 */
export interface Finishing extends ImageRef {
  description: string;
}

/** A single colour of a product, with its per-size quantities. */
export interface ColorVariant {
  color: string;
  sizes: SizeBreakdown;
}

/** One garment style within an order (e.g. MLS1035 "เช่น ลายพิมพ์สีน้ำเงิน"). */
export interface OrderProduct extends ImageRef {
  revision?: number;
  history?: ProductHistoryEntry[];
  styleCode: string;
  designName: string;
  productType: string;
  material?: string;
  /**
   * Where this SKU is in production. Absent on orders written before per-SKU
   * statuses existed — read via {@link productStatus}, never directly.
   */
  status?: ProductStatus;
  /** Fabric details, techniques, cutting and outsourcing instructions. */
  productionNotes?: string;
  finishings: Finishing[];
  /**
   * Text-only finishing list used before finishings carried photos. Kept so
   * orders written by the old schema still render — read via
   * {@link productFinishings}, never directly.
   */
  instructions?: string[];
  variants: ColorVariant[];
}

export interface ProductionQuantities {
  received: number;
  sent: number;
  defective: number;
}

export interface ProductHistoryEntry {
  id: string;
  at: string;
  actor: string;
  kind: "production" | "image" | "finishings";
  from: ProductStatus;
  to: ProductStatus;
  before: Partial<Pick<OrderProduct, "status" | "productionNotes" | "imageKey" | "finishings">>;
  after: Partial<Pick<OrderProduct, "status" | "productionNotes" | "imageKey" | "finishings">>;
  quantities?: ProductionQuantities;
  note: string;
}

/** Where to point an `<img>`, or undefined when there is no photo. */
export function productImageSrc(ref: ImageRef): string | undefined {
  if (ref.imageKey) return `/api/images/${ref.imageKey}`;
  return ref.imageUrl || undefined;
}

/** Production stage of a SKU, defaulting orders stored before it existed. */
export function productStatus(
  product: Pick<OrderProduct, "status">,
): ProductStatus {
  return product.status ?? DEFAULT_PRODUCT_STATUS;
}

/** Finishings of a product, upgrading orders stored before they had photos. */
export function productFinishings(
  product: Pick<OrderProduct, "finishings" | "instructions">,
): Finishing[] {
  if (product.finishings?.length) return product.finishings;
  return (product.instructions ?? []).map((description) => ({ description }));
}

export interface Order {
  _id: ObjectId;
  title: string;
  reference: string;
  orderDate: Date;
  status: OrderStatus;
  products: OrderProduct[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape sent to the client (ObjectId + Dates serialized to strings). */
export type SerializedOrder = Omit<
  Order,
  "_id" | "orderDate" | "createdAt" | "updatedAt"
> & {
  _id: string;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
};

/** Payload accepted when creating an order. */
export interface CreateOrderInput {
  title: string;
  reference?: string;
  orderDate?: string;
  notes?: string;
  products: {
    styleCode: string;
    designName: string;
    productType?: string;
    material?: string;
    status?: ProductStatus;
    finishings?: Finishing[];
    imageKey?: string;
    imageUrl?: string;
    variants: { color: string; sizes: Partial<SizeBreakdown> }[];
  }[];
}

/** Sum of one colour variant's sizes. */
export function variantTotal(variant: ColorVariant): number {
  return SIZES.reduce((sum, size) => sum + (variant.sizes[size] || 0), 0);
}

/** Sum of all colour variants of a product. */
export function productTotal(product: OrderProduct): number {
  return product.variants.reduce((sum, v) => sum + variantTotal(v), 0);
}

/** Total pieces across every product in an order. */
export function orderTotal(order: Pick<Order, "products">): number {
  return order.products.reduce((sum, p) => sum + productTotal(p), 0);
}
