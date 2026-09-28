import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { listOrders } from "@/lib/orders";
import { formatNumber } from "@/lib/format";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  orderTotal,
} from "@/types/order";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let orders: Awaited<ReturnType<typeof listOrders>> = [];
  let dbError = false;
  try {
    orders = await listOrders();
  } catch {
    dbError = true;
  }

  const totalPieces = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + orderTotal(o), 0);

  const countFor = (status: string) =>
    orders.filter((o) => o.status === status).length;

  const stats = [
    { label: "คำสั่งซื้อทั้งหมด", value: formatNumber(orders.length) },
    { label: "จำนวนชิ้นทั้งหมด", value: formatNumber(totalPieces) },
    { label: "ใหม่", value: formatNumber(countFor("new")) },
    { label: "กำลังผลิต", value: formatNumber(countFor("in_production")) },
  ];

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        ภาพรวม
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        ภาพรวมคำสั่งผลิต
      </Typography>

      {dbError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          mb: 3,
        }}
      >
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                {s.label}
              </Typography>
              <Typography variant="h4" sx={{ mt: 0.5 }}>
                {s.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">คำสั่งซื้อแยกตามสถานะ</Typography>
            <Button href="/orders" size="small">
              ดูคำสั่งซื้อทั้งหมด
            </Button>
          </Box>
          <Stack spacing={1.5}>
            {ORDER_STATUSES.map((status) => {
              const count = countFor(status);
              const pct = orders.length ? (count / orders.length) * 100 : 0;
              return (
                <Box key={status} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="body2" sx={{ width: 110, color: "text.secondary" }}>
                    {ORDER_STATUS_LABELS[status]}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" sx={{ width: 32, textAlign: "right" }}>
                    {count}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
