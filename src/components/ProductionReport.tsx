"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, MenuItem, Pagination, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS } from "@/types/order";
import { filterProductionEntries, summarizeProduction, type ProductionReportEntry } from "@/lib/production-report";
import { formatDateTime, formatNumber } from "@/lib/format";

export function ProductionReport({ entries, today }: { entries: ProductionReportEntry[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState(today.slice(0, 7) + "-01");
  const [end, setEnd] = useState(today);
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const invalid = Boolean(start && end && start > end);
  const filtered = invalid ? [] : filterProductionEntries(entries, start, end, department);
  const summaries = summarizeProduction(filtered).filter(s => !department || s.department === department);
  const totals = summaries.reduce((sum, s) => ({ processed: sum.processed + s.processed, sent: sum.sent + s.sent, defective: sum.defective + s.defective }), { processed: 0, sent: 0, defective: 0 });
  const max = Math.max(1, ...summaries.map(s => s.processed));
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const current = Math.min(page, pages);
  function period(days: number | null) {
    setPage(1);
    setEnd(days === null ? "" : today);
    setStart(days === null ? "" : new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10));
  }
  return <Stack spacing={3}>
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <TextField label="ตั้งแต่วันที่" type="date" value={start} onChange={e => { setStart(e.target.value); setPage(1); }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="ถึงวันที่ (รวมวันสิ้นสุด)" type="date" value={end} onChange={e => { setEnd(e.target.value); setPage(1); }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select label="แผนก" value={department || "all"} onChange={e => { setDepartment(e.target.value === "all" ? "" : e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
          <MenuItem value="all">ทุกแผนก</MenuItem>
          {PRODUCT_STATUSES.map(s => <MenuItem key={s} value={s}>{PRODUCT_STATUS_LABELS[s]}</MenuItem>)}
        </TextField>
      </Stack>
      <Stack direction="row" sx={{ mt: 1, flexWrap: "wrap" }}>
        <Button onClick={() => period(1)}>วันนี้</Button><Button onClick={() => period(7)}>7 วันล่าสุด</Button><Button onClick={() => period(30)}>30 วันล่าสุด</Button><Button onClick={() => period(null)}>ทั้งหมด</Button>
        <Button disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "กำลังอัปเดต…" : "อัปเดตข้อมูล"}</Button>
      </Stack>
      {invalid && <Alert severity="error">วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด</Alert>}
    </Paper>
    <Alert severity="info">งานที่ทำ = ส่งออก + เสีย นับตามวันที่บันทึกและแผนกที่ระบุในประวัติ รวมทุกรายการที่บันทึกจำนวน (รวมคำสั่งซื้อที่ปิดแล้ว) เสื้อหนึ่งตัวอาจถูกนับในหลายแผนก จึงไม่ใช่จำนวนเสื้อไม่ซ้ำ รายการแก้ไขที่บันทึกจำนวนใหม่จะถูกนับเพิ่มด้วย</Alert>
    {invalid ? null : <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
        {[{ label: "งานที่ทำผ่านแผนก", value: totals.processed }, { label: "ส่งออก", value: totals.sent }, { label: "เสียหาย", value: totals.defective }].map(s => <Paper key={s.label} sx={{ p: 2.5 }}><Typography color="text.secondary">{s.label}</Typography><Typography variant="h4">{formatNumber(s.value)} <Typography component="span">ตัว</Typography></Typography></Paper>)}
      </Box>
      {!filtered.length && <Alert severity="info">ยังไม่มีประวัติที่บันทึกจำนวนในช่วงเวลานี้ การเปลี่ยนขั้นตอนอย่างเดียวจะไม่ถูกนำมานับ</Alert>}
      <TableContainer component={Paper}><Table aria-label="สรุปผลงานแต่ละแผนก"><TableHead><TableRow>
        {["แผนก", "รายการบันทึก", "งานที่ทำ (ตัว)", "ส่งออก (ตัว)", "เสีย (ตัว)", "อัตราเสีย"].map(h => <TableCell key={h}>{h}</TableCell>)}
      </TableRow></TableHead><TableBody>{summaries.map(s => <TableRow key={s.department}>
        <TableCell><Button onClick={() => { setDepartment(s.department); setPage(1); }}>{PRODUCT_STATUS_LABELS[s.department]}</Button>
          <Box aria-hidden sx={{ width: 150, maxWidth: "100%", height: 6, bgcolor: "grey.100", display: "flex", borderRadius: 1, overflow: "hidden" }}><Box sx={{ width: `${s.sent / max * 100}%`, bgcolor: "primary.main" }} /><Box sx={{ width: `${s.defective / max * 100}%`, bgcolor: "error.main" }} /></Box>
        </TableCell><TableCell>{formatNumber(s.records)}</TableCell><TableCell>{formatNumber(s.processed)}</TableCell><TableCell>{formatNumber(s.sent)}</TableCell><TableCell>{formatNumber(s.defective)}</TableCell><TableCell>{s.processed ? `${s.defectRate.toFixed(1)}%` : "—"}</TableCell>
      </TableRow>)}</TableBody></Table></TableContainer>
      <Typography variant="caption" color="text.secondary">แถบสีน้ำเงิน = ส่งออก · สีแดง = เสีย · อัตราเสีย = เสีย ÷ งานที่ทำ</Typography>
      <Typography variant="h6">รายการที่นำมาคำนวณ ({formatNumber(filtered.length)})</Typography>
      {filtered.length > 0 && <TableContainer component={Paper}><Table aria-label="ประวัติที่ใช้คำนวณ"><TableHead><TableRow>{["เวลาบันทึก", "สินค้า / อ้างอิง", "แผนก", "รับเข้า", "ส่งออก", "เสีย", "ผู้บันทึก / หมายเหตุ"].map(h => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>
        {filtered.slice((current - 1) * 25, current * 25).map(e => <TableRow key={`${e.orderId}-${e.id}`}>
          <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(e.at)}</TableCell>
          <TableCell><Typography variant="body2">{e.styleCode} · {e.designName}</Typography><Button size="small" href={`/orders/${e.orderId}`}>{e.reference}</Button></TableCell>
          <TableCell>{PRODUCT_STATUS_LABELS[e.department]}</TableCell><TableCell>{formatNumber(e.quantities.received)}</TableCell><TableCell>{formatNumber(e.quantities.sent)}</TableCell><TableCell>{formatNumber(e.quantities.defective)}</TableCell><TableCell>{e.actor}<Typography variant="caption" sx={{ display: "block", whiteSpace: "pre-wrap" }}>{e.note}</Typography></TableCell>
        </TableRow>)}
      </TableBody></Table></TableContainer>}
      {pages > 1 && <Pagination count={pages} page={current} onChange={(_, value) => setPage(value)} />}
    </>}
  </Stack>;
}
