import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { currentUser } from '@/lib/access';
import { getDb } from '@/lib/mongodb';
import { parseStaffInput, saveStaff } from '@/lib/staff';
import type { User } from '@/types/user';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  try {
    const input = parseStaffInput(await request.json(), false);
    await saveStaff((await getDb()).collection<User>('users'), input, (await currentUser())!.id, (await params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const duplicate = error && typeof error === 'object' && 'code' in error && error.code === 11000;
    return NextResponse.json({ error: duplicate ? 'อีเมลนี้มีบัญชีอยู่แล้ว' : error instanceof Error && !('code' in error) ? error.message : 'บันทึกบัญชีไม่สำเร็จ' }, { status: 400 });
  }
}
