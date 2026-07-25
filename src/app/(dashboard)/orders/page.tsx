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
          <Typography variant="h4">Orders</Typography>
          <Typography variant="body2" color="text.secondary">
            {orders.length} order{orders.length === 1 ? "" : "s"}
          </Typography>
        </Box>
        <NewOrderDialog />
      </Box>

      {dbError ? (
        <Alert severity="warning">
          Could not reach the database. Make sure MongoDB is running on{" "}
          <code>localhost:27017</code>.
        </Alert>
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderStyle: "dashed" }}>
          <Typography color="text.secondary">
            No orders yet. Click <strong>New order</strong> to create one.
          </Typography>
        </Paper>
      ) : (
        <OrdersTable orders={orders} />
      )}
    </Box>
  );
}
