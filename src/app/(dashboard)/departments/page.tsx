import { requirePageUser } from "@/lib/access";
import { canAccessDepartment } from "@/lib/permissions";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { listDepartmentProducts } from "@/lib/departments";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, productStatus, productTotal } from "@/types/order";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const user = await requirePageUser();
  const items = await listDepartmentProducts().catch(() => null);
  return <Box sx={{ p: { xs: 2, md: 4 } }}>
    <Typography variant="h4" gutterBottom>งานรายแผนก</Typography>
    {user.role === "admin" && <Button href="/production-report" variant="outlined" sx={{ mb: 2 }}>ดูผลงานและยอดเสียตามช่วงเวลา</Button>}
    <Typography color="text.secondary" sx={{ mb: 3 }}>เลือกแผนกเพื่อดูและบันทึกงานรายสินค้า/SKU ตามขั้นตอนปัจจุบันของสินค้า ยกเว้นคำสั่งซื้อที่ยกเลิก</Typography>
    {user.role === "staff" && !user.departments.length && <Alert severity="info">ยังไม่ได้รับมอบหมายแผนก กรุณาติดต่อผู้ดูแลระบบ</Alert>}
    {!items ? <Alert severity="error">โหลดงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Alert> : <>
      <Typography sx={{ mb: 2 }}>สินค้าที่ไม่ถูกยกเลิก {formatNumber(items.length)} รายการ · แยกตามขั้นตอนผลิตปัจจุบัน</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
        {PRODUCT_STATUSES.filter(stage => canAccessDepartment(user, stage)).map(stage => {
          const queue = items.filter(item => productStatus(item.product) === stage);
          return <Paper key={stage} sx={{ p: 2.5 }}>
            <Typography variant="h6">{PRODUCT_STATUS_LABELS[stage]}</Typography>
            <Typography variant="h4" sx={{ my: 1 }}>{formatNumber(queue.length)} <Typography component="span" color="text.secondary">รายการสินค้า</Typography></Typography>
            <Typography variant="body2" color="text.secondary">เสื้อที่ค้างในแผนก {formatNumber(queue.reduce((sum, item) => sum + productTotal(item.product), 0))} ตัว</Typography>
            <Button href={`/departments/${stage}`} sx={{ mt: 2 }} variant={queue.length ? "contained" : "outlined"}>เปิดงาน{PRODUCT_STATUS_LABELS[stage]}</Button>
          </Paper>;
        })}
      </Box>
    </>}
  </Box>;
}
