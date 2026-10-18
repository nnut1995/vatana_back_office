import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { saveColor, type ColorDocument } from "@/lib/colors";
import { getDb } from "@/lib/mongodb";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  try {
    await saveColor((await getDb()).collection<ColorDocument>("colors"), await request.json(), (await params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const duplicate = error && typeof error === "object" && "code" in error && error.code === 11000;
    return NextResponse.json({ error: duplicate ? "ชื่อสีนี้มีอยู่แล้ว" : error instanceof Error ? error.message : "บันทึกสีไม่สำเร็จ" }, { status: 400 });
  }
}
