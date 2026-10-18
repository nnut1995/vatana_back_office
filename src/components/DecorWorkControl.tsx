"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { DECOR_PERIODS, DECOR_STEPS, decorDone, parseDecorWork } from "@/lib/decor-work";
import { ALL_SIZES, type Size } from "@/lib/order-sizes";
import { sizeColumns, sizeLabel } from "@/lib/size-columns";
import { formatDateISO, formatDateTime, formatNumber } from "@/lib/format";
import type { DecorWorkInput, OrderProduct } from "@/types/order";
import { useFeedback } from "@/components/Feedback";

export function DecorWorkControl({ product, orderId, index, readOnly = false, steps = [...DECOR_STEPS] }: {
  product: OrderProduct; orderId: string; index: number; readOnly?: boolean; steps?: string[];
}) {
  const router = useRouter();
  const notify = useFeedback();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employee, setEmployee] = useState("");
  const [step, setStep] = useState<string>(DECOR_STEPS[0]);
  const [date, setDate] = useState("");
  const [period, setPeriod] = useState<DecorWorkInput["period"]>("morning");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const requestId = useRef("");
  const savingRef = useRef(false);
  const entries = product.decorWork ?? [];
  const options = [...new Set([...steps, ...entries.map(e => e.step)])];
  const usedSteps = [...new Set(entries.map(e => e.step))];
  const columns = sizeColumns(product);
  const changed = () => { requestId.current = crypto.randomUUID(); };
  const remaining = (i: number, size: Size) => Math.max(0, (product.variants[i].sizes[size] ?? 0) - decorDone(product, step.trim(), product.variants[i].color, size, product.variants[i].colorId));

  async function save() {
    if (savingRef.current) return;
    setError("");
    let input: DecorWorkInput;
    try {
      input = parseDecorWork({ employee, step, date, period, quantities: product.variants.map((_, variantIndex) => ({
        variantIndex, color: product.variants[variantIndex].color, colorId: product.variants[variantIndex].colorId, sizes: Object.fromEntries(ALL_SIZES.map(size => [size, Number(counts[`${variantIndex}-${size}`] || 0)])),
      })) });
    } catch (e) { setError(e instanceof Error ? e.message : "ข้อมูลไม่ถูกต้อง"); return; }
    savingRef.current = true; setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/products/${index}/decor-work`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, requestId: requestId.current }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "บันทึกไม่สำเร็จ"); return; }
      setOpen(false); notify("บันทึกงานตกแต่งแล้ว"); router.refresh();
    } catch { setError("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { savingRef.current = false; setSaving(false); }
  }

  return <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap", mb: 1 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>บันทึกงานตกแต่ง</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      {!!entries.length && <Button size="small" onClick={() => { setHistoryPage(1); setHistoryOpen(true); }}>ดูสรุปและประวัติ ({formatNumber(entries.length)})</Button>}
      {!readOnly && <Button variant="outlined" size="small" onClick={() => {
        setCounts({}); setError(""); setDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
        changed(); setOpen(true);
      }}>บันทึกงานที่ทำแล้ว</Button>}
      </Stack>
    </Stack>
    <Typography variant="body2" color="text.secondary">{entries.length ? `บันทึกแล้ว ${formatNumber(entries.length)} รายการ · ${formatNumber(usedSteps.length)} ขั้นตอน` : "ยังไม่มีรายการงานตกแต่ง"}</Typography>
    {historyOpen && <Dialog open onClose={() => setHistoryOpen(false)} fullWidth maxWidth="md" scroll="paper" aria-labelledby={`decor-history-${orderId}-${index}`}>
      <DialogTitle id={`decor-history-${orderId}-${index}`}>สรุปและประวัติงานตกแต่ง · {product.styleCode}</DialogTitle>
      <DialogContent dividers sx={{ overflowWrap: "anywhere" }}>
      <Stack spacing={2}>
      <Box sx={{ overflowX: "auto" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>ยอดทำแล้วแยกขั้นตอน (ทำแล้ว / ยอดสั่ง)</Typography>
        <Table size="small" aria-label="ยอดงานตกแต่งแยกขั้นตอน">
          <TableHead><TableRow><TableCell>ขั้นตอน</TableCell><TableCell>สี</TableCell>{columns.map(size => <TableCell key={size} align="center">{sizeLabel(product, size)}</TableCell>)}</TableRow></TableHead>
          <TableBody>{usedSteps.flatMap(name => product.variants.map((variant, i) => <TableRow key={`${name}-${i}`}>
            <TableCell>{name}</TableCell><TableCell>{variant.color}</TableCell>
            {columns.map(size => <TableCell key={size} align="center">{formatNumber(decorDone(product, name, variant.color, size, variant.colorId))} / {formatNumber(variant.sizes[size] ?? 0)}</TableCell>)}
          </TableRow>))}</TableBody>
        </Table>
      </Box>
      <Box>
        <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>รายการที่ทำแล้ว · {entries.length} รายการ</Typography>
        <Stack spacing={1}>{[...entries].sort((a, b) => b.date.localeCompare(a.date) || (["morning", "afternoon", "ot"].indexOf(b.period) - ["morning", "afternoon", "ot"].indexOf(a.period)) || b.at.localeCompare(a.at)).slice((historyPage - 1) * 10, historyPage * 10).map(entry => <Box key={entry.id} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{entry.employee} · {entry.step} · {formatDateISO(entry.date)} · ช่วง{DECOR_PERIODS[entry.period]}</Typography>
          {entry.quantities.map((q, i) => <Typography key={i} variant="body2">สี{q.color} · {ALL_SIZES.filter(size => q.sizes[size]).map(size => `${sizeLabel(product, size)} ${formatNumber(q.sizes[size]!)}`).join(" · ")}</Typography>)}
          <Typography variant="caption" color="text.secondary">บันทึกโดย {entry.actor} · {formatDateTime(entry.at)}</Typography>
        </Box>)}</Stack>
        {entries.length > 10 && <Pagination count={Math.ceil(entries.length / 10)} page={historyPage} onChange={(_, value) => setHistoryPage(value)} sx={{ mt: 2 }} aria-label="หน้าประวัติงานตกแต่ง" />}
      </Box>
      </Stack>
      </DialogContent>
      <DialogActions><Button onClick={() => setHistoryOpen(false)}>ปิด</Button></DialogActions>
    </Dialog>}
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="md" aria-labelledby={`decor-${orderId}-${index}`}>
      <DialogTitle id={`decor-${orderId}-${index}`}>บันทึกงานตกแต่ง · {product.styleCode}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="ผู้ทำงาน" value={employee} onChange={e => { setEmployee(e.target.value); changed(); }} disabled={saving} required helperText="ระบุชื่อพนักงานที่ทำงานนี้ เช่น พนักงาน A" />
          <Autocomplete freeSolo options={options} inputValue={step} onInputChange={(_, value) => { setStep(value); changed(); }} disabled={saving}
            renderInput={params => <TextField {...params} label="ขั้นตอน" required helperText="เลือกขั้นตอน หรือพิมพ์ชื่อใหม่เพื่อเพิ่มเอง ชื่อจะเก็บไว้เลือกซ้ำเมื่อบันทึกงาน" />} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField type="date" label="วันที่ทำงาน" value={date} onChange={e => { setDate(e.target.value); changed(); }} disabled={saving} required slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField select label="ช่วงเวลา" value={period} onChange={e => { setPeriod(e.target.value as DecorWorkInput["period"]); changed(); }} disabled={saving} fullWidth>
              {Object.entries(DECOR_PERIODS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
          </Stack>
          <Typography variant="body2" color="text.secondary">ใส่เฉพาะจำนวนที่ทำในรอบนี้ แยกสีและไซซ์ · บันทึกเกินยอดสั่งได้</Typography>
          <Box sx={{ overflowX: "auto" }}><Table size="small" aria-label="จำนวนงานตกแต่งที่ทำ">
            <TableHead><TableRow><TableCell>สี</TableCell>{columns.map(size => <TableCell key={size}>{sizeLabel(product, size)}</TableCell>)}</TableRow></TableHead>
            <TableBody>{product.variants.map((variant, i) => <TableRow key={i}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{variant.color}<Button size="small" disabled={saving || !step.trim()} onClick={() => {
                setCounts(previous => ({ ...previous, ...Object.fromEntries(columns.map(size => [`${i}-${size}`, String(remaining(i, size))])) })); changed();
              }}>เติมยอดที่เหลือ</Button></TableCell>
              {columns.map(size => <TableCell key={size}><TextField type="number" size="small" sx={{ minWidth: 92 }} value={counts[`${i}-${size}`] ?? ""}
                onChange={e => { setCounts({ ...counts, [`${i}-${size}`]: e.target.value }); changed(); }} disabled={saving}
                helperText={`สั่ง ${formatNumber(variant.sizes[size] ?? 0)} · ทำแล้ว ${formatNumber(decorDone(product, step.trim(), variant.color, size, variant.colorId))}`} slotProps={{ htmlInput: { min: 0, step: 1, "aria-label": `สี${variant.color} ${sizeLabel(product, size)}` } }} /></TableCell>)}
            </TableRow>)}</TableBody>
          </Table></Box>
        </Stack>
      </DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setOpen(false)}>ยกเลิก</Button><Button variant="contained" disabled={saving} onClick={save}>{saving ? "กำลังบันทึก…" : "บันทึกงาน"}</Button></DialogActions>
    </Dialog>
  </Box>;
}
