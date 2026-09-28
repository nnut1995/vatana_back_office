import { Alert, Box, Typography } from "@mui/material";
import { listProductionReportEntries } from "@/lib/production-report-data";
import { ProductionReport } from "@/components/ProductionReport";
import { bangkokDate } from "@/lib/production-report";

export const dynamic = "force-dynamic";

export default async function ProductionReportPage() {
  const entries = await listProductionReportEntries().catch(() => null);
  return <Box sx={{ p: { xs: 2, md: 4 } }}>
    <Typography variant="h4" gutterBottom>ผลงานรายแผนก</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>จำนวนงานที่ทำและจำนวนเสียจากประวัติการผลิต เลือกช่วงวันที่ตามเวลาประเทศไทย</Typography>
    {entries ? <ProductionReport entries={entries} today={bangkokDate()} /> : <Alert severity="error">โหลดประวัติการผลิตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</Alert>}
  </Box>;
}
