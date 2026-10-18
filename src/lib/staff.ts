import bcrypt from 'bcryptjs';
import { ObjectId, type Collection } from 'mongodb';
import type { User } from '@/types/user';
import { PRODUCT_STATUSES, type ProductStatus } from '@/types/order';
export type StaffInput = { name: string; email: string; role: 'admin' | 'staff'; departments: ProductStatus[]; active: boolean; password?: string };
export function parseStaffInput(value: unknown, creating: boolean): StaffInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ข้อมูลไม่ถูกต้อง');
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string' || !v.name.trim() || v.name.length > 120) throw new Error('กรุณาระบุชื่อไม่เกิน 120 ตัวอักษร');
  if (typeof v.email !== 'string' || v.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) throw new Error('กรุณาระบุอีเมลให้ถูกต้อง');
  if (v.role !== 'admin' && v.role !== 'staff') throw new Error('บทบาทไม่ถูกต้อง');
  if (typeof v.active !== 'boolean') throw new Error('สถานะบัญชีไม่ถูกต้อง');
  if (!Array.isArray(v.departments) || !v.departments.every(s => PRODUCT_STATUSES.includes(s))) throw new Error('แผนกไม่ถูกต้อง');
  const departments = [...new Set(v.departments)] as ProductStatus[];
  if (v.role === 'staff' && v.active && !departments.length) throw new Error('กรุณาเลือกอย่างน้อยหนึ่งแผนก');
  if (v.password !== undefined && typeof v.password !== 'string') throw new Error('รหัสผ่านไม่ถูกต้อง');
  const password = v.password as string | undefined;
  if ((creating || password) && (!password || password.length < 10 || Buffer.byteLength(password, 'utf8') > 72)) throw new Error('รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร และไม่เกิน 72 ไบต์');
  return { name: v.name.trim(), email: v.email.trim().toLowerCase(), role: v.role, departments: v.role === 'admin' ? [] : departments, active: v.active, ...(password ? { password } : {}) };
}
export function publicStaff(user: User) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, departments: user.departments ?? [], active: user.active !== false };
}
export async function saveStaff(collection: Collection<User>, input: StaffInput, actorId: string, id?: string) {
  if (id && !ObjectId.isValid(id)) throw new Error('ไม่พบบัญชี');
  if (id === actorId && (input.role !== 'admin' || !input.active)) throw new Error('ไม่สามารถลดสิทธิ์หรือปิดบัญชีของตัวเองได้');
  await collection.createIndex({ email: 1 }, { unique: true });
  const { password, ...fields } = input;
  const now = new Date();
  const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
  if (id) {
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { ...fields, updatedAt: now, ...(passwordHash ? { passwordHash } : {}) } });
    if (!result.matchedCount) throw new Error('ไม่พบบัญชี');
  } else {
    if (!passwordHash) throw new Error('กรุณาระบุรหัสผ่าน');
    await collection.insertOne({ ...fields, passwordHash, createdAt: now, updatedAt: now } as User);
  }
}
