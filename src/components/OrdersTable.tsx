"use client";

import { useRouter } from "next/navigation";
import {
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

export function OrdersTable({ orders }: { orders: SerializedOrder[] }) {
  const router = useRouter();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order</TableCell>
            <TableCell>Order date</TableCell>
            <TableCell align="right">Products</TableCell>
            <TableCell align="right">Total pieces</TableCell>
            <TableCell>Status</TableCell>
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
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {order.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: "var(--font-geist-mono), monospace" }}
                >
                  {order.reference}
                </Typography>
              </TableCell>
              <TableCell>{formatDateISO(order.orderDate)}</TableCell>
              <TableCell align="right">{order.products.length}</TableCell>
              <TableCell align="right">{formatNumber(orderTotal(order))}</TableCell>
              <TableCell>
                <OrderStatusControl id={order._id} status={order.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
