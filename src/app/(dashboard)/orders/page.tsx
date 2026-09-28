import { Alert, Box, Paper, Typography } from "@mui/material";
import { listOrders } from "@/lib/orders";
import { OrdersTable } from "@/components/OrdersTable";
import { NewOrderDialog } from "@/components/NewOrderDialog";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  let orders: Awaited<ReturnType<typeof listOrders>> = [];
  let dbError = false;
  try {
    orders = await listOrders();
  } catch {
    dbError = true;
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4">คำสั่งซื้อ</Typography>
          <Typography variant="body2" color="text.secondary">
            {orders.length} รายการ
          </Typography>
        </Box>
        <NewOrderDialog />
      </Box>

      {dbError ? (
        <Alert severity="warning">
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ
        </Alert>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderStyle: "dashed" }}>
          <Typography color="text.secondary">
            ยังไม่มีคำสั่งซื้อ คลิก <strong>สร้างคำสั่งซื้อ</strong> เพื่อเริ่มต้น
          </Typography>
        </Paper>
      ) : (
        <OrdersTable orders={orders} />
      )}
    </Box>
  );
}
