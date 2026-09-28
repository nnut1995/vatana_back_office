"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Chip, Pagination, Paper, Stack, TextField, Typography } from "@mui/material";
import { ProductRow } from "@/components/OrderProductionSheet";
import { formatDateISO, formatNumber } from "@/lib/format";
import { productTotal, type ProductStatus } from "@/types/order";
import type { DepartmentProduct } from "@/lib/department-products";

const PAGE_SIZE = 12;

export function DepartmentQueue({ items, stage }: { items: DepartmentProduct[]; stage: ProductStatus }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const term = query.trim().toLocaleLowerCase("th-TH");
  const filtered = items.filter(({ product, orderReference }) =>
    [product.styleCode, product.designName, product.material, orderReference, ...product.variants.map(v => v.color)]
      .some(value => value?.toLocaleLowerCase("th-TH").includes(term)));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  return <Stack spacing={2}>
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
      <Chip label={`${formatNumber(items.length)} รายการสินค้า`} color="primary" />
      <Chip label={`ยอดสั่งรวม ${formatNumber(items.reduce((sum, item) => sum + productTotal(item.product), 0))} ตัว`} />
      <Button disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? "กำลังอัปเดต…" : "อัปเดตงานล่าสุด"}</Button>
    </Stack>
    <TextField label="ค้นหารหัสสินค้า ชื่อลาย สี วัสดุ หรือเลขที่อ้างอิง" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} fullWidth size="small" />
    {!filtered.length ? <Paper sx={{ p: 4, textAlign: "center" }}><Typography>{query ? "ไม่พบสินค้าที่ตรงกับคำค้น" : stage === "sent" ? "ยังไม่มีสินค้าที่ส่งแล้วในงานที่เปิดอยู่" : "ยังไม่มีสินค้าที่ต้องทำในแผนกนี้"}</Typography></Paper> : <>
      <Typography variant="body2" color="text.secondary">พบ {formatNumber(filtered.length)} รายการ · SKU เดียวกันจากคนละคำสั่งซื้อแยกเป็นคนละงาน</Typography>
      {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(item => <Box key={`${item.orderId}-${item.index}`}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary">อ้างอิง {item.orderReference} · {formatDateISO(item.orderDate)}</Typography>
          <Button size="small" href={`/orders/${item.orderId}`}>ดูใบสั่งซื้อ</Button>
        </Stack>
        <ProductRow product={item.product} orderId={item.orderId} index={item.index} previewImage />
      </Box>)}
      {pages > 1 && <Pagination page={currentPage} count={pages} onChange={(_, value) => setPage(value)} />}
    </>}
  </Stack>;
}
