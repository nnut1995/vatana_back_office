import { Box, Typography } from '@mui/material';
import { requireAdminPage } from '@/lib/access';
import { getDb } from '@/lib/mongodb';
import { publicStaff } from '@/lib/staff';
import type { User } from '@/types/user';
import { StaffManagement } from '@/components/StaffManagement';
export const dynamic = 'force-dynamic';
export default async function StaffPage() {
  const actor = await requireAdminPage();
  const users = await (await getDb()).collection<User>('users').find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray();
  return <Box sx={{ p: { xs: 2, md: 4 } }}><Typography variant="h4" gutterBottom>จัดการพนักงาน</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>ผู้ดูแลระบบเห็นทุกแผนก พนักงานเห็นและบันทึกงานได้เฉพาะแผนกที่ได้รับมอบหมาย</Typography><StaffManagement users={users.map(publicStaff)} currentId={actor.id} /></Box>;
}
