import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/access';
export async function requireAuth(): Promise<NextResponse | null> {
  return await currentUser() ? null : NextResponse.json({ error: 'กรุณาเข้าสู่ระบบด้วยบัญชีที่เปิดใช้งาน' }, { status: 401 });
}
export async function requireAdmin(): Promise<NextResponse | null> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบ' }, { status: 401 });
  return user.role === 'admin' ? null : NextResponse.json({ error: 'เฉพาะผู้ดูแลระบบเท่านั้น' }, { status: 403 });
}
