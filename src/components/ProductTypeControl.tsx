"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { ProductTypeField } from "@/components/ProductTypeField";
import { parseProductType } from "@/lib/product-type";

export function ProductTypeControl({ productType, orderId, index, readOnly = false, legacyType, needsCanonical = false }: {
  productType: string; orderId: string; index: number; readOnly?: boolean; legacyType?: string; needsCanonical?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const selected = Boolean(productType.trim());

  async function save() {
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/products/${index}/type`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productType: value.trim(), requestId: requestId.current }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); return;
      }
      setOpen(false); router.refresh();
    } catch { setError("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <>
    <Stack spacing={0.5} sx={{ width: "100%" }}>
      <ProductTypeBadge productType={productType} />
      {legacyType && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>ประเภทเสื้อเดิมจากอีกช่อง: {legacyType}</Typography>}
      {!readOnly && <Button size="small" variant={selected ? "text" : "outlined"} onClick={() => {
        setValue(selected ? productType : ""); setError(""); requestId.current = crypto.randomUUID(); setOpen(true);
      }}>{selected ? "แก้ไขประเภทเสื้อ" : "เลือกประเภทเสื้อ"}</Button>}
    </Stack>
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="xs" aria-labelledby={`type-${orderId}-${index}`}>
      <DialogTitle id={`type-${orderId}-${index}`}>เลือกประเภทเสื้อ</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {legacyType && <Alert severity="info" sx={{ mb: 2 }}>ค่าเดิมจากอีกช่อง: {legacyType} — เลือกประเภทเสื้อที่ต้องการใช้ ค่าก่อนแก้จะเก็บในประวัติ</Alert>}
        <ProductTypeField value={value} disabled={saving}
          onChange={text => { setValue(text); requestId.current = crypto.randomUUID(); }} />
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={() => setOpen(false)}>ยกเลิก</Button>
        <Button variant="contained" disabled={saving || !parseProductType(value) || (value.trim() === productType.trim() && !legacyType && !needsCanonical)} onClick={save}>
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </DialogActions>
    </Dialog>
  </>;
}
