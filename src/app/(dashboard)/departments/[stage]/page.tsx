import { requirePageUser } from "@/lib/access";
import { canAccessDepartment } from "@/lib/permissions";
import { notFound } from "next/navigation";
import { Alert, Box, Button, Typography } from "@mui/material";
import { listDepartmentProducts } from "@/lib/departments";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, productStatus, type ProductStatus } from "@/types/order";
import { DepartmentQueue } from "@/components/DepartmentQueue";
import { listDecorSteps } from "@/lib/decor-work-data";
import { DECOR_STEPS } from "@/lib/decor-work";
import { todayInBangkok } from "@/lib/order-urgency";

export const dynamic = "force-dynamic";

export default async function DepartmentPage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!PRODUCT_STATUSES.includes(stage as ProductStatus)) notFound();
  const user = await requirePageUser();
  if (!canAccessDepartment(user, stage as ProductStatus)) notFound();
  const selected = stage as ProductStatus;
  const items = await listDepartmentProducts().catch(() => null);
  const decorSteps = selected === "decor" && items ? await listDecorSteps().catch(() => [...DECOR_STEPS]) : undefined;
  return <Box sx={{ p: { xs: 2, md: 4 } }}>
    <Button href="/departments" sx={{ mb: 2 }}>ทุกแผนก</Button>
    <Typography variant="h4" gutterBottom>{PRODUCT_STATUS_LABELS[selected]}</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>งานรายสินค้า/SKU ในขั้นตอนนี้ กดที่รายการเพื่อบันทึกจำนวนหรือส่งต่อแผนกถัดไป</Typography>
    {!items ? <Alert severity="error">โหลดงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Alert> :
      <DepartmentQueue admin={user.role === "admin"} stage={selected} today={todayInBangkok()} decorSteps={decorSteps} items={items.filter(item => productStatus(item.product) === selected)} />}
  </Box>;
}
