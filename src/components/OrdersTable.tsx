"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Chip,
  Link as MuiLink,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { OrderStatusControl } from "@/components/OrderStatusControl";
import { formatDateISO, formatNumber } from "@/lib/format";
import { orderTotal, type SerializedOrder } from "@/types/order";
import { deliveryLabel, deliveryState } from "@/lib/order-urgency";

/** Delivery date with a red "late" or amber "due soon" chip for open orders. */
export function DeliveryDateCell({ order, today }: { order: Pick<SerializedOrder, "status" | "deliveryDate">; today: string }) {
  if (!order.deliveryDate) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const state = deliveryState(order, today);
  const label = deliveryLabel(order, today);
  return (
    <>
      <Typography variant="body2" sx={{ fontWeight: state === "overdue" ? 700 : undefined, color: state === "overdue" ? "error.main" : undefined }}>
        {formatDateISO(order.deliveryDate)}
      </Typography>
      {label && <Chip size="small" label={label} color={state === "overdue" ? "error" : "warning"} variant={state === "overdue" ? "filled" : "outlined"} sx={{ mt: 0.5 }} />}
    </>
  );
}

export function OrdersTable({ orders, today }: { orders: SerializedOrder[]; today: string }) {
  const router = useRouter();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>คำสั่งซื้อ</TableCell>
            <TableCell>กำหนดส่ง</TableCell>
            <TableCell>วันที่สั่งซื้อ</TableCell>
            <TableCell align="right">สินค้า</TableCell>
            <TableCell align="right">จำนวนชิ้นทั้งหมด</TableCell>
            <TableCell>สถานะ</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order._id}
              hover
              sx={{ cursor: "pointer" }}
              onClick={() => router.push(`/orders/${order._id}`)}
            >
              <TableCell>
                {/* A real link, so the order opens from the keyboard or in a new tab. */}
                <MuiLink
                  component={Link}
                  href={`/orders/${order._id}`}
                  underline="hover"
                  color="text.primary"
                  variant="body2"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  sx={{ fontWeight: 600, display: "block" }}
                >
                  {order.title}
                </MuiLink>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {order.reference}
                </Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}><DeliveryDateCell order={order} today={today} /></TableCell>
              <TableCell>{formatDateISO(order.orderDate)}</TableCell>
              <TableCell align="right">{order.products.length}</TableCell>
              <TableCell align="right">{formatNumber(orderTotal(order))}</TableCell>
              <TableCell>
                <OrderStatusControl key={`${order._id}-${order.status}`} id={order._id} status={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
