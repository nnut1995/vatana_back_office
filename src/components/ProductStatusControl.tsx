"use client";
import { ALL_SIZES } from "@/lib/order-sizes";


import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import {  productImageSrc, PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, type ProductStatus, type ProductHistoryEntry } from "@/types/order";
import { previousStageOutput } from "@/lib/production-defaults";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useFeedback } from "@/components/Feedback";

const KIND = { product_details: "แก้ไขสินค้า", product_type: "แก้ไขประเภทเสื้อ", production: "บันทึกการผลิต", image: "เปลี่ยนรูปสินค้า", variants: "แก้ไขสีและจำนวนตามไซซ์", work_details: "แก้ไขรายละเอียดงาน" };
const FIELDS = { styleCode: "รหัส SKU", designName: "ชื่อลาย / ชื่องาน", productType: "ประเภทเสื้อ", fabricType: "ประเภทเสื้อเดิมจากอีกช่อง", artworks: "Print On / รูปประกอบ", status: "ขั้นตอนผลิต", productionNotes: "หมายเหตุการผลิต", imageKey: "รูปสินค้า", variants: "สีและจำนวนตามไซซ์", workFront: "หน้า", workBack: "หลัง", workSleeves: "แขน", productionSteps: "ขั้นตอนการผลิต", workRemark: "หมายเหตุงานพิเศษ" };

function Snapshot({ data }: { data: ProductHistoryEntry["before"] }) {
  return <Stack spacing={0.5}>{Object.entries(data).map(([key, value]) => (
    <Box key={key}>
      <Typography variant="caption" color="text.secondary">{FIELDS[key as keyof typeof FIELDS]}</Typography>
      {key === "variants" ? <Stack>{data.variants?.map((v, i) => <Typography key={i} variant="body2">{v.color} · {ALL_SIZES.filter(size => v.sizes[size] !== undefined).map(size => `${size}: ${v.sizes[size]}`).join(" · ")}</Typography>)}</Stack> : key === "artworks" ? <Stack>{data.artworks?.length ? data.artworks.map((artwork, i) => <Box key={i}><Typography variant="body2">{artwork.caption || "—"}</Typography>{productImageSrc(artwork) && <Button href={productImageSrc(artwork)!} target="_blank" rel="noopener noreferrer" size="small">ดูรูปประกอบ</Button>}</Box>) : <Typography variant="body2">ยังไม่มีรูปประกอบ</Typography>}</Stack> : key === "imageKey" && value ? <Button href={`/api/images/${value}`} target="_blank" size="small">ดูรูปภาพ</Button> :
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{key === "status" ? PRODUCT_STATUS_LABELS[value as ProductStatus] : String(value || "—")}</Typography>}
    </Box>
  ))}</Stack>;
}

export function ProductStatusControl({ orderId, index, status, productionNotes = "", history = [], orderedUnits }: {
  orderId: string; index: number; status: ProductStatus; productionNotes?: string;
  history?: ProductHistoryEntry[]; orderedUnits: number;
}) {
  const router = useRouter();
  const notify = useFeedback();
  const [refreshing, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // "record": log quantities for the current department. "move": hand the SKU to another stage.
  const [mode, setMode] = useState<"record" | "move">("record");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [next, setNext] = useState(status);
  const [notes, setNotes] = useState(productionNotes);
  const [reason, setReason] = useState("");
  const [withQuantityChecked, setWithQuantity] = useState(false);
  const [received, setReceived] = useState("");
  const [sent, setSent] = useState("");
  const [defective, setDefective] = useState("0");
  const [receivedEdited, setReceivedEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const lastPayload = useRef("");
  const busy = saving || refreshing;
  const remaining = Number(received) - Number(sent) - Number(defective);
  const latest = [...history].reverse().find(e => e.quantities);

  const suggested = previousStageOutput(history, next);
  const nextStage = PRODUCT_STATUSES[PRODUCT_STATUSES.indexOf(status) + 1] as ProductStatus | undefined;

  function changeStage(stage: ProductStatus) {
    setNext(stage);
    if (!receivedEdited) {
      const source = previousStageOutput(history, stage);
      setReceived(source ? String(source.sent) : "");
    }
    setError("");
  }

  function begin(kind: "record" | "move") {
    const stage = kind === "move" ? nextStage ?? status : status;
    setMode(kind); setNext(stage); setNotes(productionNotes); setReason(""); setWithQuantity(kind === "record");
    const source = previousStageOutput(history, stage);
    setReceived(source ? String(source.sent) : ""); setReceivedEdited(false);
    setSent(""); setDefective("0"); setError("");
    requestId.current = crypto.randomUUID(); lastPayload.current = ""; setOpen(true);
  }

  async function save() {
    const counts = [received, sent, defective.trim() || "0"];
    // In "record" mode a note on its own is still allowed: leave ส่งออก and เสีย empty.
    const noteOnly = mode === "record" && !sent.trim() && Number(defective || 0) === 0 && (!!reason.trim() || notes.trim() !== productionNotes);
    const withQuantity = withQuantityChecked && !noteOnly;
    if (withQuantity && (counts.some(n => !/^\d+$/.test(n) || !Number.isSafeInteger(Number(n))) || Number(received) <= 0 || remaining < 0)) {
      setError("กรอกจำนวนเต็มให้ครบ รับเข้าต้องมากกว่า 0 และส่งออก + เสีย ต้องไม่เกินรับเข้า"); return;
    }
    if (!withQuantity && next === status && notes.trim() === productionNotes && !reason.trim()) {
      setError(mode === "move" ? "กรุณาเลือกขั้นตอนอื่นที่จะส่งต่อ" : "กรุณาเปลี่ยนขั้นตอน ระบุจำนวน หรือเพิ่มหมายเหตุของรายการนี้"); return;
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
      setOpen(false);
      notify(next !== status ? `ส่งต่อไป${PRODUCT_STATUS_LABELS[next]}แล้ว` : withQuantity ? "บันทึกจำนวนแล้ว" : "บันทึกหมายเหตุแล้ว"); startTransition(() => router.refresh());
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <Stack spacing={1} sx={{ maxWidth: "100%" }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>ขั้นตอนผลิต: {PRODUCT_STATUS_LABELS[status]}</Typography>
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
      <Button variant="contained" disabled={busy} onClick={() => begin("record")} sx={{ minHeight: 44 }}>บันทึกจำนวน</Button>
      <Button variant="outlined" disabled={busy} onClick={() => begin("move")} sx={{ minHeight: 44 }}>
        {nextStage ? `ส่งต่อ: ${PRODUCT_STATUS_LABELS[nextStage]}` : "เปลี่ยนขั้นตอน"}
      </Button>
      <Button onClick={() => setHistoryOpen(true)} sx={{ minHeight: 44 }}>ประวัติทั้งหมด ({formatNumber(history.length)})</Button>
    </Stack>
    <Typography variant="caption" color="text.secondary">จำนวนที่สั่ง {formatNumber(orderedUnits)} ตัว</Typography>
    {latest?.quantities && <Typography variant="caption">รายการจำนวนล่าสุด · {PRODUCT_STATUS_LABELS[latest.to]}: รับ {latest.quantities.received} / ส่งออก {latest.quantities.sent} / เสีย {latest.quantities.defective} / ค้าง {latest.quantities.received - latest.quantities.sent - latest.quantities.defective} ตัว</Typography>}
    {productionNotes && <Typography variant="caption" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 440 }}>{productionNotes}</Typography>}
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} fullWidth maxWidth="sm">
      <DialogTitle>{mode === "record" ? `บันทึกจำนวน · ${PRODUCT_STATUS_LABELS[status]}` : "ส่งต่องานไปขั้นตอนอื่น"}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {mode === "move" && <>
          <TextField select label="ส่งต่อไปที่" value={next} disabled={busy} onChange={e => changeStage(e.target.value as ProductStatus)}
            helperText={`ตอนนี้อยู่ที่ ${PRODUCT_STATUS_LABELS[status]}`}>
            {PRODUCT_STATUSES.map(s => <MenuItem key={s} value={s} disabled={s === status}>{PRODUCT_STATUS_LABELS[s]}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Checkbox checked={withQuantityChecked} disabled={busy} onChange={e => setWithQuantity(e.target.checked)} />} label={`บันทึกจำนวนรับเข้าของ${PRODUCT_STATUS_LABELS[next]}ด้วย`} />
        </>}
        {withQuantityChecked && <>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {([{ label: "รับเข้า (ตัว)", value: received, set: (value: string) => { setReceived(value); setReceivedEdited(true); } }, { label: "ส่งออก (ตัว)", value: sent, set: setSent }, { label: "เสีย (ตัว)", value: defective, set: setDefective }]).map(f => <TextField key={f.label} fullWidth label={f.label} type="number" value={f.value} disabled={busy} onChange={e => { f.set(e.target.value); setError(""); }} slotProps={{ htmlInput: { min: 0, step: 1, inputMode: "numeric" } }} />)}
          </Stack>
          <Typography variant="caption" color="text.secondary">{suggested ? `รับเข้าเติมจากยอดส่งออกล่าสุดของ${PRODUCT_STATUS_LABELS[suggested.stage]} ${suggested.sent} ตัว (แก้ไขได้)` : "ยังไม่มียอดส่งออกจากขั้นตอนก่อนหน้า กรุณากรอกรับเข้าเอง"} · ไม่กรอกจำนวนเสียจะนับเป็น 0 · บันทึกซ้ำได้หลายครั้ง ยอดสั่งซื้อไม่เปลี่ยน{mode === "record" && " · จะบันทึกแค่หมายเหตุ ให้เว้นช่องส่งออกว่างไว้"}</Typography>
          <Typography color={remaining < 0 ? "error" : "text.secondary"}>ค้างในแผนกจากรายการนี้: {formatNumber(remaining)} ตัว</Typography>
        </>}
        <TextField label="หมายเหตุรายการ / เหตุผลที่แก้ไข" multiline minRows={2} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} helperText="เก็บในประวัติของรายการนี้ เช่น เสีย 2 ตัวจากตะเข็บขาด หรืออ้างอิงเลขรายการที่ต้องการแก้" />
        <TextField label="หมายเหตุประจำสินค้า" multiline minRows={2} value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} helperText="แสดงบนสินค้านี้ตลอด ทุกแผนกเห็น" />
        {error && <Alert severity="error">{error}</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={busy} onClick={() => setOpen(false)}>ยกเลิก</Button><Button variant="contained" disabled={busy} onClick={save}>{busy ? "กำลังบันทึก…" : mode === "record" ? "บันทึกจำนวน" : `ส่งต่อไป${PRODUCT_STATUS_LABELS[next]}`}</Button></DialogActions>
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
