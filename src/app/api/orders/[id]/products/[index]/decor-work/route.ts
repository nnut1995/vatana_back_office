import { NextResponse } from "next/server";
import { currentUser } from "@/lib/access";
import { canAccessDepartment } from "@/lib/permissions";
import { parseDecorWork } from "@/lib/decor-work";
import { recordDecorWork } from "@/lib/decor-work-data";
import { listColors } from "@/lib/colors";
import { getDb } from "@/lib/mongodb";
import type { Order } from "@/types/order";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!canAccessDepartment(user, "decor")) return NextResponse.json({ error: "เฉพาะผู้ดูแลหรือพนักงานแผนกตกแต่ง" }, { status: 403 });
  const { id, index } = await params;
  let input, requestId;
  try {
    const body = await request.json();
    input = parseDecorWork(body);
    requestId = body.requestId;
    if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) throw new Error("รหัสรายการไม่ถูกต้อง");
    if (!/^\d+$/.test(index)) throw new Error("สินค้าไม่ถูกต้อง");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  try {
    const ok = await recordDecorWork((await getDb()).collection<Order>("orders"), id, Number(index), user.email, input, requestId, await listColors());
    if (!ok) return NextResponse.json({ error: "ไม่พบงานในแผนกตกแต่ง กรุณาโหลดงานใหม่" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "บันทึกไม่สำเร็จ" }, { status: 409 });
  }
}
