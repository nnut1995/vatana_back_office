import { ObjectId } from "mongodb";
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getDb } from '@/lib/mongodb';
import type { User } from '@/types/user';
import type { AccessUser } from '@/lib/permissions';
export const currentUser = cache(async (): Promise<AccessUser | null> => {
  const session = await auth();
  if (!session?.user?.id || !ObjectId.isValid(session.user.id)) return null;
  const user = await (await getDb()).collection<User>('users').findOne({ _id: new ObjectId(session.user.id) });
  if (!user || user.active === false) return null;
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, departments: user.departments ?? [], active: true };
});
export async function requirePageUser() {
  const user = await currentUser();
  if (!user) redirect('/access-denied');
  return user;
}
export async function requireAdminPage() {
  const user = await requirePageUser();
  if (user.role !== 'admin') redirect('/departments');
  return user;
}
