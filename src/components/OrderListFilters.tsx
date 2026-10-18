"use client";
import { useRef } from "react";
import { Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import { ORDER_SORTS, type OrderListParams } from "@/lib/order-list";
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/types/order";

// Status, sort and page size apply as soon as they change; search applies on Enter or the search button.
export function OrderListFilters({ options }: { options: OrderListParams }) {
  const form = useRef<HTMLFormElement>(null);
  const apply = () => setTimeout(() => form.current?.requestSubmit());
  const selectProps = { inputLabel: { shrink: true }, select: { notched: true } };
  return <Box component="form" ref={form} action="/orders" method="get" sx={{ mb: 3 }}>
    <Stack spacing={2} useFlexGap direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "center" }, flexWrap: "wrap" }}>
      <TextField size="small" type="search" name="q" label="ค้นหาชื่อ เลขที่อ้างอิง หรือ SKU" defaultValue={options.q} sx={{ flex: 1, minWidth: { md: 240 } }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 100, enterKeyHint: "search" } }} />
      <TextField size="small" select slotProps={selectProps} name="status" label="สถานะ" defaultValue={options.status || "all"} onChange={apply} sx={{ minWidth: 160 }}>
        <MenuItem value="all">ทุกสถานะ</MenuItem>
        {ORDER_STATUSES.map(s => <MenuItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</MenuItem>)}
        <MenuItem value="shipped">จัดส่งแล้ว (ข้อมูลเดิม)</MenuItem>
      </TextField>
      <TextField size="small" select slotProps={selectProps} name="sort" label="เรียงลำดับ" defaultValue={options.sort} onChange={apply} sx={{ minWidth: 200 }}>
        {Object.entries(ORDER_SORTS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <TextField size="small" select slotProps={selectProps} name="pageSize" label="รายการต่อหน้า" defaultValue={options.pageSize} onChange={apply} sx={{ minWidth: 115 }}>
        {[10, 25, 50].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
      </TextField>
      <Button type="submit" variant="contained">ค้นหา</Button><Button href="/orders">ล้างตัวกรอง</Button>
    </Stack>
  </Box>;
}
