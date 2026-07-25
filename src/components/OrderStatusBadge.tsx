import Chip from "@mui/material/Chip";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/types/order";

const COLORS: Record<
  OrderStatus,
  "default" | "warning" | "info" | "secondary" | "success" | "error"
> = {
  new: "info",
  in_production: "warning",
  shipped: "secondary",
  completed: "success",
  cancelled: "error",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Chip
      label={ORDER_STATUS_LABELS[status]}
      color={COLORS[status]}
      size="small"
      variant="outlined"
    />
  );
}
