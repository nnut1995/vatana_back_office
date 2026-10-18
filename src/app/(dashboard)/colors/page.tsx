import { Box, Typography } from "@mui/material";
import { requireAdminPage } from "@/lib/access";
import { listColors } from "@/lib/colors";
import { ColorManagement } from "@/components/ColorManagement";
export const dynamic = "force-dynamic";
export default async function ColorsPage() {
  await requireAdminPage();
  const colors = await listColors();
  return <Box sx={{ p: { xs: 2, md: 4 } }}><Typography variant="h4" gutterBottom>ตั้งค่าสี</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>เพิ่มชื่อสีและรหัส HEX เพื่อใช้เลือกสีสินค้า สีที่ตั้งค่าจะแสดงบนเว็บและใน PDF</Typography>
    <ColorManagement colors={colors} />
  </Box>;
}
