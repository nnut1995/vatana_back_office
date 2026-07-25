import { notFound } from "next/navigation";
import { Box, Button, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getOrder } from "@/lib/orders";
import { OrderProductionSheet } from "@/components/OrderProductionSheet";
import { OrderStatusControl } from "@/components/OrderStatusControl";
import { formatDateISO, formatNumber } from "@/lib/format";
import { orderTotal } from "@/types/order";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const totalPieces = orderTotal(order);

  return (
    <Box sx={{ p: 4 }}>
      <Button href="/orders" startIcon={<ArrowBackIcon />} size="small" sx={{ mb: 2 }}>
        All orders
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              New order: {formatDateISO(order.orderDate)}
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
          <OrderStatusControl id={order._id} status={order.status} size="medium" />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Products
            </Typography>
            <Typography variant="h6">{order.products.length}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total pieces
            </Typography>
            <Typography variant="h6">{formatNumber(totalPieces)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Colour variants
            </Typography>
            <Typography variant="h6">
              {formatNumber(
                order.products.reduce((n, p) => n + p.variants.length, 0),
              )}
            </Typography>
          </Box>
        </Stack>

        {order.notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Chip label="Notes" size="small" sx={{ mr: 1 }} />
            <Typography variant="body2" component="span" color="text.secondary">
              {order.notes}
            </Typography>
          </>
        )}
      </Paper>

      <OrderProductionSheet order={order} />
    </Box>
  );
}
