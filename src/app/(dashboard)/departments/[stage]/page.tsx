import { notFound } from "next/navigation";
import { Alert, Box, Button, Typography } from "@mui/material";
import { listDepartmentProducts } from "@/lib/departments";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, productStatus, type ProductStatus } from "@/types/order";
import { DepartmentQueue } from "@/components/DepartmentQueue";

export const dynamic = "force-dynamic";

export default async function DepartmentPage({ params }: { params: Promise<{ stage: string }> }) {
  const { stage } = await params;
  if (!PRODUCT_STATUSES.includes(stage as ProductStatus)) notFound();
  const selected = stage as ProductStatus;
  const items = await listDepartmentProducts().catch(() => null);
  return <Box sx={{ p: { xs: 2, md: 4 } }}>
    <Button href="/departments" sx={{ mb: 2 }}>ทุกแผนก</Button>
    <Typography variant="h4" gutterBottom>{PRODUCT_STATUS_LABELS[selected]}</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>งานรายสินค้า/SKU ในขั้นตอนนี้ เรียงวันที่สั่งซื้อเก่าก่อน บันทึกงานหรือส่งต่อแผนกได้จากแต่ละรายการ</Typography>
    {!items ? <Alert severity="error">โหลดงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Alert> :
      <DepartmentQueue stage={selected} items={items.filter(item => productStatus(item.product) === selected)} />}
  </Box>;
}
