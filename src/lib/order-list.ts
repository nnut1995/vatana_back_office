import type { Collection, Document, Filter, Sort } from "mongodb";
import { ORDER_STATUSES, type Order } from "@/types/order";

export const ORDER_SORTS = {
  delivery: "กำหนดส่งใกล้สุดก่อน",
  newest: "สร้างล่าสุดก่อน", oldest: "สร้างเก่าสุดก่อน",
  date_desc: "วันที่สั่งซื้อล่าสุดก่อน", date_asc: "วันที่สั่งซื้อเก่าสุดก่อน",
  title: "ชื่อคำสั่งซื้อ ก–ฮ / A–Z",
};
export type OrderListParams = { q: string; status: string; sort: keyof typeof ORDER_SORTS; page: number; pageSize: number };
export function parseOrderListParams(raw: Record<string, string | string[] | undefined>): OrderListParams {
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] as string : "";
  const page = Number(value("page"));
  const size = Number(value("pageSize"));
  const sort = value("sort");
  return { q: value("q").trim().slice(0, 100),
    status: [...ORDER_STATUSES, "shipped"].includes(value("status")) ? value("status") : "",
    sort: Object.hasOwn(ORDER_SORTS, sort) ? sort as keyof typeof ORDER_SORTS : "newest",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: [10, 25, 50].includes(size) ? size : 10 };
}
export async function queryOrderPage(collection: Collection<Order>, options: OrderListParams) {
  const filter: Filter<Order> = {};
  if (options.status) filter.status = options.status as Order["status"];
  if (options.q) {
    const literal = options.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["title", "reference", "products.styleCode", "products.designName"].map(field => ({ [field]: { $regex: literal, $options: "i" } }));
  }
  const sorts: Record<Exclude<OrderListParams["sort"], "delivery">, Sort> = {
    newest: { createdAt: -1, _id: -1 }, oldest: { createdAt: 1, _id: 1 },
    date_desc: { orderDate: -1, createdAt: -1, _id: -1 }, date_asc: { orderDate: 1, createdAt: 1, _id: 1 },
    title: { title: 1, _id: 1 },
  };
  const total = await collection.countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / options.pageSize));
  const page = Math.min(options.page, pages);
  const projection = { "products.history": 0, statusHistory: 0 };
  const skip = (page - 1) * options.pageSize;
  const orders = options.sort === "delivery"
    ? await deliveryPage(collection, filter, projection, skip, options.pageSize)
    : await collection.find(filter, { projection })
      .sort(sorts[options.sort]).skip(skip).limit(options.pageSize).toArray();
  return { orders, total, pages, page };
}
/** Soonest delivery first; orders without a delivery date come after all dated ones. */
async function deliveryPage(collection: Collection<Order>, filter: Filter<Order>, projection: Document, skip: number, limit: number) {
  const dated: Filter<Order> = { $and: [filter, { deliveryDate: { $gt: "" } }] };
  const undated: Filter<Order> = { $and: [filter, { $nor: [{ deliveryDate: { $gt: "" } }] }] };
  const datedCount = await collection.countDocuments(dated);
  const first = skip < datedCount
    ? await collection.find(dated, { projection }).sort({ deliveryDate: 1, createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray()
    : [];
  if (first.length >= limit) return first;
  const rest = await collection.find(undated, { projection }).sort({ createdAt: -1, _id: -1 })
    .skip(Math.max(0, skip - datedCount)).limit(limit - first.length).toArray();
  return [...first, ...rest];
}

export function orderListUrl(options: OrderListParams, page: number) {
  const query = new URLSearchParams({ q: options.q, status: options.status, sort: options.sort, pageSize: String(options.pageSize), page: String(page) });
  return `/orders?${query}`;
}
