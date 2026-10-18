import { requireAdminPage } from "@/lib/access";
import { Alert, Box, Button, Chip, Link as MuiLink, ListItemButton, Paper, Stack, Typography } from "@mui/material";
import { getDb } from "@/lib/mongodb";
import { serializeOrder } from "@/lib/orders";
import { listDepartmentProducts } from "@/lib/departments";
import { RefreshButton } from "@/components/RefreshButton";
import { formatDateISO, formatNumber } from "@/lib/format";
import { OPEN_ORDER_STATUSES, SOON_DAYS, daysUntil, deliveryLabel, deliveryState, todayInBangkok } from "@/lib/order-urgency";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
  orderTotal,
  productStatus,
  productTotal,
  type Order,
  type OrderStatus,
  type SerializedOrder,
} from "@/types/order";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<OrderStatus, "info" | "warning" | "success" | "error" | "default"> = {
  new: "info", in_production: "warning", completed: "success", cancelled: "error", shipped: "default",
};
const LIST_LIMIT = 6;

function OrderList({ title, orders, today, empty }: { title: string; orders: SerializedOrder[]; today: string; empty: string }) {
  return (
    <Paper sx={{ p: 2.5, minWidth: 0 }}>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {title} <Typography component="span" color="text.secondary">({formatNumber(orders.length)})</Typography>
      </Typography>
      {!orders.length ? <Typography color="text.secondary">{empty}</Typography> : (
        <Stack divider={<Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />}>
          {orders.slice(0, LIST_LIMIT).map(order => {
            const state = deliveryState(order, today);
            return (
              <Box key={order._id} sx={{ py: 1.25, display: "flex", gap: 2, alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <MuiLink href={`/orders/${order._id}`} underline="hover" color="text.primary" sx={{ fontWeight: 600, display: "block", overflowWrap: "anywhere" }}>
                    {order.title}
                  </MuiLink>
                  <Typography variant="body2" color="text.secondary">
                    กำหนดส่ง {formatDateISO(order.deliveryDate!)} · {formatNumber(orderTotal(order))} ตัว · {ORDER_STATUS_LABELS[order.status]}
                  </Typography>
                </Box>
                <Chip size="small" label={deliveryLabel(order, today)} color={state === "overdue" ? "error" : "warning"} variant={state === "overdue" ? "filled" : "outlined"} sx={{ flexShrink: 0 }} />
              </Box>
            );
          })}
        </Stack>
      )}
      {orders.length > LIST_LIMIT && (
        <Button href="/orders?sort=delivery&status=" sx={{ mt: 1 }}>ดูทั้งหมด {formatNumber(orders.length)} รายการ</Button>
      )}
    </Paper>
  );
}

export default async function DashboardPage() {
  await requireAdminPage();
  const today = todayInBangkok();
  let open: SerializedOrder[] = [];
  let statusCounts: Partial<Record<OrderStatus, number>> = {};
  let departmentItems: Awaited<ReturnType<typeof listDepartmentProducts>> | null = null;
  let dbError = false;
  try {
    const orders = (await getDb()).collection<Order>("orders");
    const [openOrders, counts, items] = await Promise.all([
      orders.find({ status: { $in: OPEN_ORDER_STATUSES } }, { projection: { "products.history": 0, statusHistory: 0 } }).toArray(),
      orders.aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
      listDepartmentProducts(),
    ]);
    open = openOrders.map(serializeOrder);
    statusCounts = Object.fromEntries(counts.map(c => [c._id, c.n]));
    departmentItems = items;
  } catch {
    dbError = true;
  }

  const byDueDate = (a: SerializedOrder, b: SerializedOrder) => daysUntil(a.deliveryDate!, today) - daysUntil(b.deliveryDate!, today);
  const overdue = open.filter(o => deliveryState(o, today) === "overdue").sort(byDueDate);
  const dueSoon = open.filter(o => ["today", "soon"].includes(deliveryState(o, today))).sort(byDueDate);
  const noDate = open.filter(o => !o.deliveryDate).length;

  const stages = PRODUCT_STATUSES.map(stage => {
    const queue = (departmentItems ?? []).filter(item => productStatus(item.product) === stage);
    return { stage, skus: queue.length, pieces: queue.reduce((sum, item) => sum + productTotal(item.product), 0) };
  });
  const busiest = Math.max(1, ...stages.map(s => s.pieces));

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Typography variant="h4">ภาพรวม</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        วันนี้ {formatDateISO(today)} · คำสั่งซื้อที่ยังไม่เสร็จ {formatNumber(open.length)} รายการ
      </Typography>

      {dbError && (
        <Alert severity="warning" sx={{ mb: 3 }} action={<RefreshButton />}>
          ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ
        </Alert>
      )}

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, mb: 2 }}>
        <OrderList title="เลยกำหนดส่ง" orders={overdue} today={today} empty="ไม่มีคำสั่งซื้อที่เลยกำหนดส่ง" />
        <OrderList title={`ต้องส่งภายใน ${SOON_DAYS} วัน`} orders={dueSoon} today={today} empty={`ไม่มีคำสั่งซื้อที่ต้องส่งใน ${SOON_DAYS} วันนี้`} />
      </Box>
      {noDate > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          คำสั่งซื้อที่ยังไม่เสร็จแต่ยังไม่ได้ใส่กำหนดส่ง {formatNumber(noDate)} รายการ
        </Typography>
      )}

      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6">งานค้างในแต่ละแผนก</Typography>
          <Button href="/departments">ดูงานรายแผนก</Button>
        </Box>
        <Stack spacing={0.5}>
          {stages.map(({ stage, skus, pieces }) => (
            <ListItemButton
              key={stage}
              href={`/departments/${stage}`}
              sx={{
                display: "grid", gridTemplateColumns: { xs: "110px 1fr", sm: "170px 1fr 190px" }, columnGap: 2, rowGap: 0.5, alignItems: "center",
                py: 1, px: 1, borderRadius: 1, color: skus ? "text.primary" : "text.disabled", minHeight: 44,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: skus ? 600 : 400 }}>{PRODUCT_STATUS_LABELS[stage]}</Typography>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
                <Box sx={{ height: "100%", width: `${(pieces / busiest) * 100}%`, bgcolor: "primary.main", borderRadius: 4 }} />
              </Box>
              <Typography variant="body2" sx={{ gridColumn: { xs: "2", sm: "auto" }, textAlign: { sm: "right" }, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {formatNumber(skus)} รายการ · {formatNumber(pieces)} ตัว
              </Typography>
            </ListItemButton>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 1.5 }}>คำสั่งซื้อแยกตามสถานะ</Typography>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {ORDER_STATUSES.map(status => (
            <Chip
              key={status}
              component="a"
              href={`/orders?status=${status}`}
              clickable
              color={STATUS_COLORS[status]}
              variant="outlined"
              label={`${ORDER_STATUS_LABELS[status]} ${formatNumber(statusCounts[status] ?? 0)}`}
              sx={{ height: 40, fontSize: 15, px: 0.5 }}
            />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
