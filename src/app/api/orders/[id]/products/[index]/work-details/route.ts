import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { updateProductWorkDetails } from "@/lib/orders";
import { parseWorkSpecification, WORK_DETAIL_FIELDS } from "@/lib/work-details";

/** Replace the complete work specification and record one atomic audit entry. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id, index } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }
  const details = parseWorkSpecification(body);
  if (!details || !WORK_DETAIL_FIELDS.every((key) => Object.hasOwn(body as object, key))) {
    return NextResponse.json({ error: "กรุณาส่งรายละเอียดงานครบทุกช่อง (ไม่เกิน 5,000 ตัวอักษร) และรูปประกอบไม่เกิน 3 รูปพร้อมข้อความไม่เกิน 120 ตัวอักษร" }, { status: 400 });
  }
  const requestId = (body as { requestId?: unknown }).requestId;
  if (requestId !== undefined && (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId))) {
    return NextResponse.json({ error: "รหัสคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    const result = await updateProductWorkDetails(id, Number(index), details, requestId as string | undefined);
    if (!result.ok) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อหรือสินค้า" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH work-details failed:", error);
    return NextResponse.json({ error: "บันทึกรายละเอียดงานไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 500 });
  }
}
