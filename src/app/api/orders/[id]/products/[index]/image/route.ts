import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { updateProductImage } from "@/lib/orders";
import { isProductImageKey } from "@/lib/s3";

/**
 * Set or clear the photo of one product inside an existing order.
 *
 * Body: `{ "imageKey": "products/<uuid>.webp" }` to set, or
 *       `{ "imageKey": null }` to remove the photo.
 *
 * The key must first be obtained from `POST /api/uploads`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id, index } = await params;

  let body: { imageKey?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  const imageKey = body.imageKey ?? null;
  if (imageKey !== null && !isProductImageKey(imageKey)) {
    return NextResponse.json(
      { error: "กรุณาเลือกรูปสินค้าที่อัปโหลดแล้ว หรือลบรูปภาพ" },
      { status: 400 },
    );
  }

  const result = await updateProductImage(id, Number(index), imageKey);
  if (!result.ok) {
    return NextResponse.json({ error: "ไม่พบคำสั่งซื้อหรือสินค้า" }, { status: 404 });
  }

  // Retain prior photos: the append-only history still references them.

  return NextResponse.json({ success: true, imageKey });
}
