import { ALL_SIZES } from "../lib/order-sizes";
import type { SizeBreakdown } from "../lib/order-sizes";
import type { ObjectId } from "mongodb";

export const ORDER_STATUSES = [
  "new",
  "in_production",
  "completed",
  "cancelled",
] as const;

/** shipped is retained only to read historical orders and audit entries. */
export type OrderStatus = (typeof ORDER_STATUSES)[number] | "shipped";

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

// Public compatibility exports; runtime consumers import order-sizes directly.
export { SIZES, CHILD_SIZES, ALL_SIZES } from "../lib/order-sizes";
export type { Size, SizeBreakdown } from "../lib/order-sizes";

export const GARMENT_TYPES = ["เสื้อเด็ก", "เสื้อผู้ใหญ่", "ผู้ใหญ่-ผ้าตัว", "ผู้ใหญ่-ผ้าชิ้น"] as const;

export interface WorkDetails {
  workFront: string;
  workBack: string;
  workSleeves: string;
  productionSteps: string;
  workRemark: string;
}

/** Anything that can carry a photo: an uploaded key, or an external URL. */
export interface ImageRef {
  /** S3 object key of an uploaded photo, e.g. "products/<uuid>.webp". */
  imageKey?: string;
  /** Externally hosted photo. Only used when there is no uploaded `imageKey`. */
  imageUrl?: string;
}

/** A single colour of a product, with its per-size quantities. */
export interface ColorVariant {
  color: string;
  colorId?: string;
  colorHex?: string;
  sizes: SizeBreakdown;
}

export interface ProductionArtwork extends ImageRef {
  caption: string;
}

export interface ProductionSheetDetails {
  /** Legacy alias retained for compatibility and audit; use productTypeValue. */
  fabricType?: string;
  artworks?: ProductionArtwork[];
}

/** One garment style within an order (e.g. MLS1035 "เช่น ลายพิมพ์สีน้ำเงิน"). */
export interface OrderProduct extends ImageRef, ProductionSheetDetails {
  decorWork?: DecorWorkEntry[];
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
  workFront?: string;
  workBack?: string;
  workSleeves?: string;
  productionSteps?: string;
  workRemark?: string;
  variants: ColorVariant[];
}

export interface DecorWorkInput {
  employee: string;
  step: string;
  date: string;
  period: "morning" | "afternoon" | "ot";
  quantities: { variantIndex: number; color: string; colorId?: string; sizes: Partial<SizeBreakdown> }[];
}

export interface DecorWorkEntry extends DecorWorkInput {
  id: string;
  at: string;
  actor: string;
  /** Snapshot colour names so historical entries survive order edits. */
  quantities: { variantIndex: number; color: string; colorId?: string; sizes: Partial<SizeBreakdown> }[];
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
  kind: "production" | "image" | "product_type" | "work_details" | "variants" | "product_details";
  from: ProductStatus;
  to: ProductStatus;
  before: Partial<Pick<OrderProduct, "styleCode" | "designName" | "status" | "productType" | "fabricType" | "artworks" | "productionNotes" | "imageKey" | "variants" | "workFront" | "workBack" | "workSleeves" | "productionSteps" | "workRemark">>;
  after: Partial<Pick<OrderProduct, "styleCode" | "designName" | "status" | "productType" | "fabricType" | "artworks" | "productionNotes" | "imageKey" | "variants" | "workFront" | "workBack" | "workSleeves" | "productionSteps" | "workRemark">>;
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

export interface OrderStatusHistoryEntry {
  id: string;
  at: string;
  actor: string;
  from: OrderStatus;
  to: OrderStatus;
}

export interface Order {
  statusRevision?: number;
  statusHistory?: OrderStatusHistoryEntry[];
  _id: ObjectId;
  title: string;
  reference: string;
  orderDate: Date;
  /** Optional delivery date; absent on historical orders. */
  deliveryDate?: string;
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
  deliveryDate?: string;
  notes?: string;
  products: {
    styleCode: string;
    designName: string;
    productType: string;
    material?: string;
    /** Legacy alias retained for compatibility and audit; use productTypeValue. */
  fabricType?: string;
    artworks?: ProductionArtwork[];
    status?: ProductStatus;
    workFront?: string;
    workBack?: string;
    workSleeves?: string;
    productionSteps?: string;
    workRemark?: string;
    imageKey?: string;
    imageUrl?: string;
    variants: { color: string; colorId?: string; colorHex?: string; sizes: Partial<SizeBreakdown> }[];
  }[];
}

/** Sum of one colour variant's sizes. */
export function variantTotal(variant: ColorVariant): number {
  return ALL_SIZES.reduce((sum, size) => sum + (variant.sizes[size] || 0), 0);
}

/** Sum of all colour variants of a product. */
export function productTotal(product: OrderProduct): number {
  return product.variants.reduce((sum, v) => sum + variantTotal(v), 0);
}

/** Total pieces across every product in an order. */
export function orderTotal(order: Pick<Order, "products">): number {
  return order.products.reduce((sum, p) => sum + productTotal(p), 0);
}
