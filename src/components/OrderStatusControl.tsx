"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Stack } from "@mui/material";
import { useFeedback } from "@/components/Feedback";
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
  const [refreshing, startTransition] = useTransition();
  const [value, setValue] = useState<OrderStatus>(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const notify = useFeedback();

  function requestChange(next: OrderStatus) {
    if (next === value) return;
    // Cancelling hides the order from every department queue, so ask first.
    if (next === "cancelled") setConfirmCancel(true);
    else void changeStatus(next, value);
  }

  async function changeStatus(next: OrderStatus, previous: OrderStatus, undo = false) {
    setError("");
    setValue(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, requestId: crypto.randomUUID() }),
      });
      if (res.ok) {
        startTransition(() => router.refresh());
        notify(
          undo ? `เปลี่ยนกลับเป็น "${ORDER_STATUS_LABELS[next]}" แล้ว` : `บันทึกสถานะ "${ORDER_STATUS_LABELS[next]}" แล้ว`,
          undo || previous === "shipped" ? undefined : { action: { label: "เลิกทำ", onClick: () => void changeStatus(previous, next, true) } },
        );
      } else {
        setValue(previous);
        setError("บันทึกสถานะไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    } catch {
      setValue(previous);
      setError("บันทึกสถานะไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={1} onClick={e => e.stopPropagation()}>
    <Select
      size={size}
      value={value}
      inputProps={{ "aria-label": "สถานะคำสั่งซื้อ" }}
      disabled={saving || refreshing}
      onChange={(e) => requestChange(e.target.value as OrderStatus)}
      sx={{ minWidth: 150 }}
      onClick={(e) => e.stopPropagation()}
    >
      {value === "shipped" && <MenuItem disabled value="shipped">จัดส่งแล้ว (สถานะเดิม)</MenuItem>}
      {ORDER_STATUSES.map((s) => (
        <MenuItem key={s} value={s}>
          {ORDER_STATUS_LABELS[s]}
        </MenuItem>
      ))}
    </Select>
    {error && <Alert severity="error">{error}</Alert>}
    <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} onClick={e => e.stopPropagation()}>
      <DialogTitle>ยกเลิกคำสั่งซื้อนี้?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          สินค้าในคำสั่งซื้อนี้จะหายออกจากงานของทุกแผนก และพนักงานจะบันทึกงานเพิ่มไม่ได้ ประวัติเดิมยังอยู่ครบ และเปลี่ยนสถานะกลับได้ภายหลัง
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmCancel(false)} autoFocus>ไม่ยกเลิก</Button>
        <Button color="error" variant="contained" onClick={() => { setConfirmCancel(false); void changeStatus("cancelled", value); }}>
          ยกเลิกคำสั่งซื้อ
        </Button>
      </DialogActions>
    </Dialog>
    </Stack>
  );
}
