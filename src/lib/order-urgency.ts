import type { OrderStatus } from "@/types/order";

/** Orders still being worked on. Completed, cancelled and legacy shipped orders are never "late". */
export const OPEN_ORDER_STATUSES: OrderStatus[] = ["new", "in_production"];

export type DeliveryState = "overdue" | "today" | "soon" | "later" | "none" | "closed";

/** Today's date (YYYY-MM-DD) on the factory's clock, not the server's. */
export function todayInBangkok(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(now);
}

/** Whole days from `today` to `date` (negative when the date has passed). Both are YYYY-MM-DD. */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export const SOON_DAYS = 7;

export function deliveryState(order: { status: OrderStatus; deliveryDate?: string }, today: string): DeliveryState {
  if (!OPEN_ORDER_STATUSES.includes(order.status)) return "closed";
  if (!order.deliveryDate) return "none";
  const days = daysUntil(order.deliveryDate, today);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  return days <= SOON_DAYS ? "soon" : "later";
}

/** Short Thai label for the delivery state, e.g. "เลยกำหนด 3 วัน" or "อีก 2 วัน". */
export function deliveryLabel(order: { status: OrderStatus; deliveryDate?: string }, today: string): string | null {
  const state = deliveryState(order, today);
  if (state === "overdue") return `เลยกำหนด ${-daysUntil(order.deliveryDate!, today)} วัน`;
  if (state === "today") return "ส่งวันนี้";
  if (state === "soon") return `อีก ${daysUntil(order.deliveryDate!, today)} วัน`;
  return null;
}
