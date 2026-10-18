import { ObjectId } from "mongodb";
import { listColors, assignConfiguredColors } from "@/lib/colors";
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { currentUser } from '@/lib/access';
import { getDb } from '@/lib/mongodb';
import { parseVariants } from '@/lib/product-variants';
import { recordProductChange } from '@/lib/product-history';
import type { Order } from '@/types/order';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id, index } = await params;
  let variants;
  let requestId: string;
  try {
    const body = await request.json();
    const order = ObjectId.isValid(id) ? await (await getDb()).collection<Order>("orders").findOne({ _id: new ObjectId(id) }) : null;
    variants = assignConfiguredColors(parseVariants(body?.variants), await listColors(), order?.products[Number(index)]?.variants);
    if (typeof body.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) throw new Error('รหัสรายการไม่ถูกต้อง');
    requestId = body.requestId;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }
  try {
    const ok = await recordProductChange((await getDb()).collection<Order>('orders'), id, Number(index), (await currentUser())!.email, 'variants', { variants }, undefined, '', requestId);
    return ok ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'ไม่พบสินค้า' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง' }, { status: 409 });
  }
}
