"use client";
import { Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import { ORDER_SORTS, type OrderListParams } from "@/lib/order-list";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/types/order";

export function OrderListFilters({ options }: { options: OrderListParams }) {
  return <Box component="form" action="/orders" method="get" sx={{ mb: 3 }}>
    <Stack spacing={2} direction={{ xs: "column", lg: "row" }} sx={{ alignItems: { lg: "center" } }}>
      <TextField size="small" name="q" label="ค้นหาชื่อ เลขที่อ้างอิง หรือ SKU" defaultValue={options.q} sx={{ flex: 1 }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 100 } }} />
      <TextField size="small" select slotProps={{ inputLabel: { shrink: true }, select: { notched: true } }} name="status" label="สถานะ" defaultValue={options.status || "all"} sx={{ minWidth: 160 }}>
        <MenuItem value="all">ทุกสถานะ</MenuItem>
        {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</MenuItem>)}
        <MenuItem value="shipped">จัดส่งแล้ว (ข้อมูลเดิม)</MenuItem>
      </TextField>
      <TextField size="small" select slotProps={{ inputLabel: { shrink: true }, select: { notched: true } }} name="sort" label="เรียงลำดับ" defaultValue={options.sort} sx={{ minWidth: 200 }}>
        {Object.entries(ORDER_SORTS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <TextField size="small" select slotProps={{ inputLabel: { shrink: true }, select: { notched: true } }} name="pageSize" label="รายการต่อหน้า" defaultValue={options.pageSize} sx={{ minWidth: 115 }}>
        {[10, 25, 50].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
      </TextField>
      <Button type="submit" variant="contained">แสดงผล</Button><Button href="/orders">ล้างตัวกรอง</Button>
    </Stack>
  </Box>;
}
