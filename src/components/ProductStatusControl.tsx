"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, type ProductStatus, type ProductHistoryEntry } from "@/types/order";
import { formatDateTime, formatNumber } from "@/lib/format";

const KIND = { production: "บันทึกการผลิต", image: "เปลี่ยนรูปสินค้า", finishings: "แก้ไขงานตกแต่ง" };
const FIELDS = { status: "ขั้นตอนผลิต", productionNotes: "หมายเหตุการผลิต", imageKey: "รูปสินค้า", finishings: "งานตกแต่ง" };

function Snapshot({ data }: { data: ProductHistoryEntry["before"] }) {
  return <Stack spacing={0.5}>{Object.entries(data).map(([key, value]) => (
    <Box key={key}>
      <Typography variant="caption" color="text.secondary">{FIELDS[key as keyof typeof FIELDS]}</Typography>
      {key === "imageKey" && value ? <Button href={`/api/images/${value}`} target="_blank" size="small">ดูรูปภาพ</Button> :
        key === "finishings" && Array.isArray(value) ? <Stack>{value.length ? value.map((f, i) => <Box key={i}>
          <Typography variant="body2">{f.description || "ไม่มีคำอธิบาย"}</Typography>
          {(f.imageKey || f.imageUrl) && <Button href={f.imageKey ? `/api/images/${f.imageKey}` : f.imageUrl!} target="_blank" size="small">ดูรูปภาพ</Button>}
        </Box>) : <Typography variant="body2">ไม่มีรายการ</Typography>}</Stack> :
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{key === "status" ? PRODUCT_STATUS_LABELS[value as ProductStatus] : String(value || "—")}</Typography>}
    </Box>
  ))}</Stack>;
}

export function ProductStatusControl({ orderId, index, status, productionNotes = "", history = [], orderedUnits }: {
  orderId: string; index: number; status: ProductStatus; productionNotes?: string;
  history?: ProductHistoryEntry[]; orderedUnits: number;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [next, setNext] = useState(status);
  const [notes, setNotes] = useState(productionNotes);
  const [reason, setReason] = useState("");
  const [withQuantity, setWithQuantity] = useState(false);
  const [received, setReceived] = useState("");
  const [sent, setSent] = useState("");
  const [defective, setDefective] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const lastPayload = useRef("");
  const busy = saving || refreshing;
  const remaining = Number(received) - Number(sent) - Number(defective);
  const latest = [...history].reverse().find(e => e.quantities);

  function begin() {
    setNext(status); setNotes(productionNotes); setReason(""); setWithQuantity(false);
    setReceived(""); setSent(""); setDefective(""); setError("");
    requestId.current = crypto.randomUUID(); lastPayload.current = ""; setOpen(true);
  }

  async function save() {
    const counts = [received, sent, defective];
    if (withQuantity && (counts.some(n => !/^\d+$/.test(n) || !Number.isSafeInteger(Number(n))) || Number(received) <= 0 || remaining < 0)) {
      setError("กรอกจำนวนเต็มให้ครบ รับเข้าต้องมากกว่า 0 และส่งออก + เสีย ต้องไม่เกินรับเข้า"); return;
    }
    if (!withQuantity && next === status && notes.trim() === productionNotes && !reason.trim()) {
      setError("กรุณาเปลี่ยนขั้นตอน ระบุจำนวน หรือเพิ่มหมายเหตุของรายการนี้"); return;
    }
    const payload = JSON.stringify({ status: next, productionNotes: notes, note: reason,
      ...(withQuantity ? { quantities: { received: Number(received), sent: Number(sent), defective: Number(defective) } } : {}) });
    if (lastPayload.current && lastPayload.current !== payload) requestId.current = crypto.randomUUID();
    lastPayload.current = payload;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/products/${index}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), requestId: requestId.current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
      setOpen(false); startTransition(() => router.refresh());
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <Stack spacing={1} sx={{ maxWidth: "100%" }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>ขั้นตอนผลิต: {PRODUCT_STATUS_LABELS[status]}</Typography>
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
      <Button size="small" variant="outlined" disabled={busy} onClick={begin}>บันทึกการผลิต / เปลี่ยนขั้นตอน</Button>
      <Button size="small" onClick={() => setHistoryOpen(true)}>ประวัติทั้งหมด ({formatNumber(history.length)})</Button>
    </Stack>
    <Typography variant="caption" color="text.secondary">จำนวนที่สั่ง {formatNumber(orderedUnits)} ตัว</Typography>
    {latest?.quantities && <Typography variant="caption">รายการจำนวนล่าสุด · {PRODUCT_STATUS_LABELS[latest.to]}: รับ {latest.quantities.received} / ส่งออก {latest.quantities.sent} / เสีย {latest.quantities.defective} / ค้าง {latest.quantities.received - latest.quantities.sent - latest.quantities.defective} ตัว</Typography>}
    {productionNotes && <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 440 }}>{productionNotes}</Typography>}
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} fullWidth maxWidth="sm">
      <DialogTitle>บันทึกการผลิตของ SKU</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        <TextField select label="แผนก / ขั้นตอนที่บันทึก" value={next} disabled={busy} onChange={e => setNext(e.target.value as ProductStatus)}>
          {PRODUCT_STATUSES.map(s => <MenuItem key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</MenuItem>)}
        </TextField>
        <Typography variant="caption">จำนวนด้านล่างเป็นผลของแผนกที่เลือกในรายการนี้ สามารถบันทึกหลายครั้งในแผนกเดิมได้ โดยไม่เปลี่ยนยอดสั่งซื้อ</Typography>
        <FormControlLabel control={<Checkbox checked={withQuantity} disabled={busy} onChange={e => setWithQuantity(e.target.checked)} />} label="บันทึกจำนวนรับเข้า / ส่งออก / เสีย" />
        {withQuantity && <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {([{ label: "รับเข้า (ตัว)", value: received, set: setReceived }, { label: "ส่งออก (ตัว)", value: sent, set: setSent }, { label: "เสีย (ตัว)", value: defective, set: setDefective }]).map(f => <TextField key={f.label} fullWidth label={f.label} type="number" value={f.value} disabled={busy} onChange={e => { f.set(e.target.value); setError(""); }} slotProps={{ htmlInput: { min: 0, step: 1 } }} />)}
          </Stack>
          <Typography color={remaining < 0 ? "error" : "text.secondary"}>ค้างในแผนกจากรายการนี้: {formatNumber(remaining)} ตัว</Typography>
        </>}
        <TextField label="หมายเหตุรายการ / เหตุผลที่แก้ไข" multiline minRows={2} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} helperText="เช่น ส่งออก 8 ตัว เสีย 2 ตัวจากตะเข็บขาด หรืออ้างอิงรายการที่ต้องการแก้ไข" />
        <TextField label="หมายเหตุการผลิตประจำสินค้า" multiline minRows={2} value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>ยกเลิก</Button><Button variant="contained" disabled={busy} onClick={save}>{busy ? "กำลังบันทึก…" : "บันทึกและเก็บประวัติ"}</Button></DialogActions>
    </Dialog>
    <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>ประวัติ SKU ทั้งหมด ({formatNumber(history.length)} รายการ)</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <Alert severity="info">เก็บประวัติตั้งแต่เริ่มใช้ระบบบันทึกนี้ รายการเก่าไม่สามารถแก้ไขหรือลบได้ หากลงผิด ให้บันทึกรายการใหม่พร้อมเหตุผล จำนวนแต่ละรายการเป็นผลของแผนก ไม่ใช่ยอดรวมข้ามแผนก</Alert>
        {!history.length && <Typography>ยังไม่มีประวัติการเปลี่ยนแปลง</Typography>}
        {[...history].reverse().map(e => <Box key={e.id}>
          <Typography sx={{ fontWeight: 600 }}>{KIND[e.kind]} · {PRODUCT_STATUS_LABELS[e.from]} → {PRODUCT_STATUS_LABELS[e.to]}</Typography>
          <Typography variant="caption" color="text.secondary">{formatDateTime(e.at)} · {e.actor}</Typography>
          <Typography variant="caption" sx={{ display: "block" }}>เลขรายการ: {e.id}</Typography>
          {e.quantities && <Alert icon={false} severity="success" sx={{ my: 1 }}>รับเข้า {formatNumber(e.quantities.received)} ตัว · ส่งออก {formatNumber(e.quantities.sent)} ตัว · เสีย {formatNumber(e.quantities.defective)} ตัว · ค้าง {formatNumber(e.quantities.received - e.quantities.sent - e.quantities.defective)} ตัว</Alert>}
          {e.note && <Typography sx={{ my: 1, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{e.note}</Typography>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ my: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="subtitle2">ก่อนเปลี่ยน</Typography><Snapshot data={e.before} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="subtitle2">หลังเปลี่ยน</Typography><Snapshot data={e.after} /></Box>
          </Stack><Divider />
        </Box>)}
      </Stack></DialogContent>
      <DialogActions><Button onClick={() => setHistoryOpen(false)}>ปิด</Button></DialogActions>
    </Dialog>
  </Stack>;
}
