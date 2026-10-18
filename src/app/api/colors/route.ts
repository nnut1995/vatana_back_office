import { NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { listColors, saveColor, type ColorDocument } from "@/lib/colors";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const denied = await requireAuth(); if (denied) return denied;
  return NextResponse.json({ colors: await listColors() });
}
export async function POST(request: Request) {
  const denied = await requireAdmin(); if (denied) return denied;
  try {
    const id = await saveColor((await getDb()).collection<ColorDocument>("colors"), await request.json());
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const duplicate = error && typeof error === "object" && "code" in error && error.code === 11000;
    return NextResponse.json({ error: duplicate ? "ชื่อสีนี้มีอยู่แล้ว" : error instanceof Error ? error.message : "บันทึกสีไม่สำเร็จ" }, { status: 400 });
  }
}
