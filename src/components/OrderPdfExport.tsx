"use client";
import { useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

export function OrderPdfExport({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/pdf`);
      if (!response.ok) throw new Error((await response.json()).error || "ส่งออก PDF ไม่สำเร็จ");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url;
      link.download = `order-${orderId}.pdf`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { setError(e instanceof Error ? e.message : "ส่งออก PDF ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  return <Stack spacing={1} sx={{ mb: 3 }}>
    <Button sx={{ alignSelf: "flex-start" }} variant="outlined" startIcon={<PictureAsPdfIcon />}
      disabled={busy} onClick={download}>{busy ? "กำลังสร้าง PDF…" : "ดาวน์โหลดใบสั่งผลิต PDF"}</Button>
    {error && <Alert severity="error">{error}</Alert>}
  </Stack>;
}
