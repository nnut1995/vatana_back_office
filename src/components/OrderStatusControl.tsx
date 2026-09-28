"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MenuItem, Select } from "@mui/material";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/types/order";

export function OrderStatusControl({
  id,
  status,
  size = "small",
}: {
  id: string;
  status: OrderStatus;
  size?: "small" | "medium";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState<OrderStatus>(status);
  const [saving, setSaving] = useState(false);

  async function changeStatus(next: OrderStatus) {
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        startTransition(() => router.refresh());
      } else {
        setValue(status);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select
      size={size}
      value={value}
      inputProps={{ "aria-label": "สถานะคำสั่งซื้อ" }}
      disabled={saving}
      onChange={(e) => changeStatus(e.target.value as OrderStatus)}
      sx={{ minWidth: 150 }}
      onClick={(e) => e.stopPropagation()}
    >
      {ORDER_STATUSES.map((s) => (
        <MenuItem key={s} value={s}>
          {ORDER_STATUS_LABELS[s]}
        </MenuItem>
      ))}
    </Select>
  );
}
