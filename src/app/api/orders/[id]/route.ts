import { NextResponse } from "next/server";
import { getOrder, updateOrderStatus } from "@/lib/orders";
import { requireAuth } from "@/lib/api-auth";
import { ORDER_STATUSES, type OrderStatus } from "@/types/order";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }
  return NextResponse.json({ order });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body.status || !ORDER_STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json(
      { error: "กรุณาเลือกสถานะที่รองรับ" },
      { status: 400 },
    );
  }

  const updated = await updateOrderStatus(id, body.status as OrderStatus);
  if (!updated) {
    return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
