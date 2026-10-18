import { ObjectId } from "mongodb";
import { listColors, assignConfiguredColors } from "@/lib/colors";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { currentUser } from "@/lib/access";
import { getDb } from "@/lib/mongodb";
import { parseProductType } from "@/lib/product-type";
import { parseVariants } from "@/lib/product-variants";
import { parseWorkSpecification, WORK_DETAIL_FIELDS } from "@/lib/work-details";
import { recordProductChange, type ProductPatch } from "@/lib/product-history";
import type { Order } from "@/types/order";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id, index } = await params;
  let patch: ProductPatch;
  let requestId: string;
  try {
    const body = await request.json();
    if (typeof body?.styleCode !== "string" || !body.styleCode.trim() || body.styleCode.trim().length > 120) {
      throw new Error("กรุณาระบุรหัส SKU (ไม่เกิน 120 ตัวอักษร)");
    }
    if (typeof body.designName !== "string" || !body.designName.trim() || body.designName.trim().length > 200) {
      throw new Error("กรุณาระบุชื่อลาย / ชื่องาน (ไม่เกิน 200 ตัวอักษร)");
    }
    const productType = parseProductType(body?.productType);
    if (!productType) throw new Error("กรุณาระบุประเภทเสื้อ (ไม่เกิน 120 ตัวอักษร)");
    const parsed = parseVariants(body.variants);
    const order = ObjectId.isValid(id) ? await (await getDb()).collection<Order>("orders").findOne({ _id: new ObjectId(id) }) : null;
    const variants = assignConfiguredColors(parsed, await listColors(), order?.products[Number(index)]?.variants);
    const details = parseWorkSpecification(body);
    if (!details || !WORK_DETAIL_FIELDS.every(field => Object.hasOwn(body, field)) || !Object.hasOwn(body, "artworks")) {
      throw new Error("กรุณาส่งรายละเอียดงานครบทุกช่อง และรูปประกอบที่ถูกต้อง");
    }
    if (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) throw new Error("รหัสคำขอไม่ถูกต้อง");
    patch = { styleCode: body.styleCode.trim(), designName: body.designName.trim(), productType, variants, ...details };
    requestId = body.requestId;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    const ok = await recordProductChange((await getDb()).collection<Order>("orders"), id, Number(index),
      (await currentUser())!.email, "product_details", patch, undefined, "", requestId);
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 409 });
  }
}
