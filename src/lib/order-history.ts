import { ObjectId, type Collection, type UpdateFilter } from "mongodb";
import { randomUUID } from "node:crypto";
import { ORDER_STATUSES, type Order, type OrderStatus, type OrderStatusHistoryEntry } from "@/types/order";

/** Persist status and its audit entry together; never overwrite previous history. */
export async function recordOrderStatusChange(collection: Collection<Order>, id: string, status: OrderStatus, actor: string, requestId: string = randomUUID()): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) throw new Error("กรุณาเลือกสถานะที่รองรับ");
  const _id = new ObjectId(id);
  for (let attempt = 0; attempt < 5; attempt++) {
    const order = await collection.findOne({ _id }, { projection: { status: 1, statusRevision: 1, statusHistory: 1 } });
    if (!order) return false;
    if (order.statusHistory?.some(e => e.id === requestId) || order.status === status) return true;
    const entry: OrderStatusHistoryEntry = { id: requestId, at: new Date().toISOString(), actor, from: order.status, to: status };
    const result = await collection.updateOne({ _id, status: order.status,
      statusRevision: order.statusRevision ?? { $exists: false },
    }, {
      $set: { status, updatedAt: new Date() },
      $inc: { statusRevision: 1 },
      $push: { statusHistory: entry },
    } as UpdateFilter<Order>);
    if (result.matchedCount) return true;
  }
  throw new Error("มีการแก้ไขพร้อมกัน กรุณาลองอีกครั้ง");
}
