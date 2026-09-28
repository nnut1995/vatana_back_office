"use client";

import { useState } from "react";
import { Box, Checkbox, Chip, FormControlLabel, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABELS, productTotal, type OrderProduct } from "@/types/order";
import { productStageSummary } from "@/lib/product-stage-summary";
import { formatNumber } from "@/lib/format";

export function OrderProductStages({ products }: { products: OrderProduct[] }) {
  const [showAll, setShowAll] = useState(false);
  const rows = products.map(product => ({ product, stages: productStageSummary(product) }));
  const visible = PRODUCT_STATUSES.filter(stage => showAll || rows.some(row => row.stages.some(s => s.stage === stage && (s.current || s.records > 0))));
  return <Paper sx={{ mb: 3, overflow: "hidden" }}>
    <Box sx={{ p: 2.5 }}>
      <Typography variant="h6">จำนวนสินค้าแยกตามขั้นตอน</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>แต่ละแถวเป็นสินค้าในคำสั่งซื้อนี้ แสดงจำนวนรับเข้า ส่งออก เสีย และค้างตามบันทึกของแต่ละขั้นตอน (หน่วย: ตัว)</Typography>
      <FormControlLabel control={<Checkbox checked={showAll} onChange={e => setShowAll(e.target.checked)} />} label="แสดงทุกขั้นตอน" />
    </Box>
    <TableContainer><Table size="small" aria-label="จำนวนสินค้าแต่ละ SKU แยกตามขั้นตอน">
      <TableHead><TableRow>
        <TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1, minWidth: 170 }}>สินค้า / SKU</TableCell>
        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>ยอดสั่ง</TableCell>
        {visible.map(stage => <TableCell key={stage} sx={{ minWidth: 160 }}>{PRODUCT_STATUS_LABELS[stage]}</TableCell>)}
      </TableRow></TableHead>
      <TableBody>{rows.map(({ product, stages }, index) => <TableRow key={index}>
        <TableCell sx={{ position: "sticky", left: 0, bgcolor: "background.paper", zIndex: 1, verticalAlign: "top" }}>
          <Typography variant="subtitle2">{product.styleCode}</Typography><Typography variant="caption">{product.designName}</Typography>
        </TableCell>
        <TableCell align="right" sx={{ verticalAlign: "top" }}>{formatNumber(productTotal(product))}</TableCell>
        {stages.filter(s => visible.includes(s.stage)).map(s => <TableCell key={s.stage} sx={{ verticalAlign: "top", bgcolor: s.current ? "action.selected" : undefined, py: 1.5 }}>
          <Stack spacing={0.5}>
            {s.current && <Chip label="ขั้นตอนปัจจุบัน" size="small" color="primary" variant="outlined" sx={{ alignSelf: "flex-start" }} />}
            {s.records ? <>
              <Typography variant="body2">รับเข้า <strong>{formatNumber(s.received)}</strong></Typography>
              <Typography variant="body2">ส่งออก <strong>{formatNumber(s.sent)}</strong></Typography>
              <Typography variant="body2" color={s.defective ? "error" : "text.secondary"}>เสีย <strong>{formatNumber(s.defective)}</strong></Typography>
              <Typography variant="body2">ค้างตามบันทึก <strong>{formatNumber(s.remaining)}</strong></Typography>
              <Typography variant="caption" color="text.secondary">จาก {formatNumber(s.records)} รายการ</Typography>
            </> : <Typography variant="caption" color="text.secondary">ยังไม่บันทึกจำนวน</Typography>}
          </Stack>
        </TableCell>)}
      </TableRow>)}</TableBody>
    </Table></TableContainer>
    <Typography variant="caption" component="p" color="text.secondary" sx={{ p: 2, m: 0 }}>รวมทุกรายการที่บันทึกจำนวน ไม่ใช่ยอดคงคลังแบบเรียลไทม์: ค้างตามบันทึก = รับเข้า − ส่งออก − เสีย รายการแก้ไขที่ลงจำนวนซ้ำจะถูกนับเพิ่ม และไม่ควรรวมจำนวนข้ามขั้นตอนเพราะเสื้อตัวเดิมผ่านหลายแผนก</Typography>
  </Paper>;
}
