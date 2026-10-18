import { parseProductType } from "@/lib/product-type";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { currentUser } from "@/lib/access";
import { getDb } from "@/lib/mongodb";
import { recordProductChange } from "@/lib/product-history";
import { type Order } from "@/types/order";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const productType = parseProductType(body?.productType);
  if (!productType ||
      typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) {
    return NextResponse.json({ error: "กรุณาระบุประเภทเสื้อ (ไม่เกิน 120 ตัวอักษร)" }, { status: 400 });
  }
  const { id, index } = await params;
  try {
    const ok = await recordProductChange((await getDb()).collection<Order>("orders"), id, Number(index),
      (await currentUser())!.email, "product_type", { productType }, undefined, "", body.requestId);
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 409 });
  }
}
