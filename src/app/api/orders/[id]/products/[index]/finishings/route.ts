import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { updateProductFinishings } from "@/lib/orders";
import { isProductImageKey } from "@/lib/s3";
import type { Finishing } from "@/types/order";

/**
 * Replace the finishing list of one product inside an existing order.
 *
 * Body: `{ "finishings": [{ "description": "พิมพ์ลาย", "imageKey": "products/<uuid>.webp" }] }`
 *
 * Each `imageKey` must first be obtained from `POST /api/uploads`; an empty
 * array clears the product's finishings.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id, index } = await params;

  let body: { finishings?: Finishing[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  if (!Array.isArray(body.finishings)) {
    return NextResponse.json({ error: "รูปแบบรายการงานตกแต่งไม่ถูกต้อง" }, { status: 400 });
  }
  for (const finishing of body.finishings) {
    if (typeof finishing?.description !== "string") {
      return NextResponse.json(
        { error: "กรุณาระบุรายละเอียดของงานตกแต่งแต่ละรายการ" },
        { status: 400 },
      );
    }
    if (finishing.imageKey && !isProductImageKey(finishing.imageKey)) {
      return NextResponse.json(
        { error: "กรุณาเลือกรูปสินค้าที่อัปโหลดแล้ว" },
        { status: 400 },
      );
    }
  }

  const result = await updateProductFinishings(id, Number(index), body.finishings);
  if (!result.ok) {
    return NextResponse.json({ error: "ไม่พบคำสั่งซื้อหรือสินค้า" }, { status: 404 });
  }

  // Retain prior photos: the append-only history still references them.

  return NextResponse.json({ success: true });
}
