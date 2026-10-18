import { OrderPdfExport } from "@/components/OrderPdfExport";
import { requireAdminPage } from "@/lib/access";
import { notFound } from "next/navigation";
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getOrder } from "@/lib/orders";
import { OrderProductStages } from "@/components/OrderProductStages";
import { OrderProductionSheet } from "@/components/OrderProductionSheet";
import { OrderStatusHistory } from "@/components/OrderStatusHistory";
import { OrderStatusControl } from "@/components/OrderStatusControl";
import { formatDateISO, formatNumber } from "@/lib/format";
import { orderTotal } from "@/types/order";
import { listDecorSteps } from "@/lib/decor-work-data";
import { DECOR_STEPS } from "@/lib/decor-work";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const decorSteps = order.products.some(p => p.status === "decor")
    ? await listDecorSteps().catch(() => [...DECOR_STEPS]) : undefined;

  const totalPieces = orderTotal(order);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 4 }, overflowWrap: "anywhere" }}>
      <Button href="/orders" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 2 }}>
        คำสั่งซื้อทั้งหมด
      </Button>

      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ minWidth: 0, flex: "1 1 200px" }}>
            <Typography variant="overline" color="text.secondary">
              วันที่สั่งซื้อ: {formatDateISO(order.orderDate)}
            </Typography>
            <Typography variant="h4">{order.title}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontFamily: "var(--font-geist-mono), monospace", mt: 0.5 }}
            >
              {order.reference}
            </Typography>
          </Box>
          <Box sx={{ width: 150, maxWidth: "100%", "& .MuiInputBase-root": { minWidth: 0, width: "100%" } }}>
            <OrderStatusControl key={`${order._id}-${order.status}`} id={order._id} status={order.status} size="medium" />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              สินค้า
            </Typography>
            <Typography variant="h6">{order.products.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              จำนวนชิ้นทั้งหมด
            </Typography>
            <Typography variant="h6">{formatNumber(totalPieces)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              จำนวนสี
            </Typography>
            <Typography variant="h6">
              {formatNumber(
                order.products.reduce((n, p) => n + p.variants.length, 0),
              )}
            </Typography>
          </Box>
        </Stack>

        {order.deliveryDate && <Typography sx={{ mt: 2 }}>กำหนดส่ง: {formatDateISO(order.deliveryDate)}</Typography>}

        {order.notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Chip label="หมายเหตุ" size="small" sx={{ mr: 1 }} />
            <Typography variant="body2" component="span" color="text.secondary">
              {order.notes}
            </Typography>
          </>
        )}
      </Paper>

      <OrderPdfExport orderId={order._id} />
      <OrderStatusHistory history={order.statusHistory} />
      <OrderProductStages key={order._id} products={order.products} />
      <OrderProductionSheet order={order} decorSteps={decorSteps} />
    </Box>
  );
}
