import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { updateProductStatus } from "@/lib/orders";
import { PRODUCT_STATUSES, type ProductStatus } from "@/types/order";
import { validQuantities } from "@/lib/product-history";

/**
 * Move one SKU inside an existing order to another production stage.
 *
 * Body: `{ "status": "printing" }` — one of {@link PRODUCT_STATUSES}.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id, index } = await params;

  let body: { status?: string; productionNotes?: string; quantities?: unknown; note?: string; requestId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }
  if (body.productionNotes !== undefined &&
    (typeof body.productionNotes !== "string" || body.productionNotes.length > 2000)) {
    return NextResponse.json({ error: "หมายเหตุการผลิตต้องเป็นข้อความไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });
  }
  const status = body.status as ProductStatus;
  if (body.quantities !== undefined && !validQuantities(body.quantities)) {
    return NextResponse.json({ error: "จำนวนต้องเป็นจำนวนเต็ม รับเข้ามากกว่า 0 และส่งออก + เสีย ต้องไม่เกินรับเข้า" }, { status: 400 });
  }
  if ((body.note !== undefined && (typeof body.note !== "string" || body.note.length > 2000)) ||
      (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)))) {
    return NextResponse.json({ error: "หมายเหตุหรือรหัสรายการไม่ถูกต้อง" }, { status: 400 });
  }
  if (!PRODUCT_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "กรุณาเลือกสถานะที่รองรับ" },
      { status: 400 },
    );
  }

  const ok = await updateProductStatus(id, Number(index), status, body.productionNotes,
    validQuantities(body.quantities) ? body.quantities : undefined, body.note, body.requestId);
  if (!ok) {
    return NextResponse.json({ error: "ไม่พบคำสั่งซื้อหรือสินค้า" }, { status: 404 });
  }

  return NextResponse.json({ success: true, status });
}
