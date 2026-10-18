import { requireAdminPage } from "@/lib/access";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { getDb } from "@/lib/mongodb";
import { serializeOrder } from "@/lib/orders";
import { queryOrderPage, parseOrderListParams, orderListUrl } from "@/lib/order-list";
import type { Order } from "@/types/order";
import { OrdersTable } from "@/components/OrdersTable";
import { NewOrderDialog } from "@/components/NewOrderDialog";
import { OrderListFilters } from "@/components/OrderListFilters";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPage();
  const options = parseOrderListParams(await searchParams);
  let result: Awaited<ReturnType<typeof queryOrderPage>> | null = null;
  try { const db = await getDb(); result = await queryOrderPage(db.collection<Order>("orders"), options); } catch { /* Show a recoverable error, not an empty result. */ }
  return <Box sx={{ p: { xs: 2, md: 4 } }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
      <Box><Typography variant="h4">คำสั่งซื้อ</Typography><Typography variant="body2" color="text.secondary">{result ? `${formatNumber(result.total)} รายการที่ตรงกับตัวกรอง` : ""}</Typography></Box>
      <NewOrderDialog />
    </Box>
    <OrderListFilters key={JSON.stringify(options)} options={options} />
    {!result ? <Alert severity="warning">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ</Alert> : <>
      {result.orders.length ? <OrdersTable orders={result.orders.map(serializeOrder)} /> : <Paper sx={{ p: 5, textAlign: "center" }}><Typography>{options.q || options.status ? "ไม่พบคำสั่งซื้อที่ตรงกับตัวกรอง" : "ยังไม่มีคำสั่งซื้อ คลิกสร้างคำสั่งซื้อเพื่อเริ่มต้น"}</Typography></Paper>}
      <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="body2" color="text.secondary">แสดง {result.total ? formatNumber((result.page - 1) * options.pageSize + 1) : "0"}–{formatNumber(Math.min(result.page * options.pageSize, result.total))} จาก {formatNumber(result.total)} รายการ · หน้า {formatNumber(result.page)} / {formatNumber(result.pages)}</Typography>
        <Stack direction="row" spacing={1}>
          <Button href={orderListUrl(options, 1)} disabled={result.page === 1}>หน้าแรก</Button>
          <Button href={orderListUrl(options, result.page - 1)} disabled={result.page === 1}>ก่อนหน้า</Button>
          <Button href={orderListUrl(options, result.page + 1)} disabled={result.page === result.pages}>ถัดไป</Button>
          <Button href={orderListUrl(options, result.pages)} disabled={result.page === result.pages}>หน้าสุดท้าย</Button>
        </Stack>
      </Stack>
    </>}
  </Box>;
}
