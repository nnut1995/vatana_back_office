"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, ButtonBase, Chip, Collapse, MenuItem, Pagination, Paper, Stack, TextField, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { ProductRow } from "@/components/OrderProductionSheet";
import { formatDateISO, formatNumber } from "@/lib/format";
import { validColorHex } from "@/lib/color-config";
import { deliveryLabel, deliveryState } from "@/lib/order-urgency";
import { QUEUE_SORTS, sortQueue, type DepartmentProduct, type QueueSort } from "@/lib/department-products";
import { productImageSrc, productTotal, variantTotal, type ProductStatus } from "@/types/order";

const PAGE_SIZE = 20;
const itemKey = (item: DepartmentProduct) => `${item.orderId}-${item.index}`;

/** One line per SKU: what it is, how many, and when it is due. Tap to open the full production sheet. */
function QueueItem({ item, today, open, onToggle, admin, decorSteps }: {
  item: DepartmentProduct; today: string; open: boolean; onToggle: () => void; admin: boolean; decorSteps?: string[];
}) {
  const { product } = item;
  const src = productImageSrc(product);
  const due = deliveryLabel({ status: item.orderStatus, deliveryDate: item.deliveryDate }, today);
  const overdue = deliveryState({ status: item.orderStatus, deliveryDate: item.deliveryDate }, today) === "overdue";
  const panelId = `queue-item-${itemKey(item)}`;
  return (
    <Paper sx={{ overflow: "hidden" }}>
      <ButtonBase
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        sx={{
          width: "100%", textAlign: "left", p: 1.5, gap: 2, justifyContent: "flex-start", alignItems: "center",
          display: "grid", gridTemplateColumns: { xs: "56px minmax(0, 1fr) auto", sm: "64px minmax(0, 1fr) auto auto" },
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box sx={{ width: { xs: 56, sm: 64 }, height: { xs: 56, sm: 64 }, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "grey.50", display: "grid", placeItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <Typography variant="caption" color="text.secondary">ไม่มีรูป</Typography>}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
            <Box component="span" sx={{ fontFamily: "var(--font-geist-mono), monospace", color: "text.primary" }}>{product.styleCode}</Box>
            {" · "}อ้างอิง {item.orderReference}
          </Typography>
          <Typography sx={{ fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" }}>{product.designName}</Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", columnGap: 1.5, rowGap: 0.25, mt: 0.5 }}>
            {product.variants.map((v, i) => (
              <Typography key={`${v.color}-${i}`} variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                <Box component="span" sx={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", mr: 0.5, bgcolor: validColorHex(v.colorHex) ? v.colorHex : "transparent", border: "1px solid rgba(0,0,0,0.2)" }} />
                {v.color || "ไม่ระบุสี"} {formatNumber(variantTotal(v))}
              </Typography>
            ))}
          </Stack>
          {(item.deliveryDate || due) && (
            <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", columnGap: 1, rowGap: 0.5, mt: 0.5 }}>
              {item.deliveryDate && <Typography variant="body2" color={overdue ? "error.main" : "text.secondary"} sx={{ whiteSpace: "nowrap" }}>กำหนดส่ง {formatDateISO(item.deliveryDate)}</Typography>}
              {due && <Chip size="small" label={due} color={overdue ? "error" : "warning"} variant={overdue ? "filled" : "outlined"} />}
            </Stack>
          )}
        </Box>
        <Box sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
          <Typography variant="h6" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(productTotal(product))}</Typography>
          <Typography variant="body2" component="span" color="text.secondary"> ตัว</Typography>
        </Box>
        <ExpandMoreIcon sx={{ display: { xs: "none", sm: "block" }, color: "text.secondary", transition: "transform 150ms", transform: open ? "rotate(180deg)" : "none" }} />
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Box id={panelId} sx={{ px: 1.5, pb: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary">สั่งเมื่อ {formatDateISO(item.orderDate)}</Typography>
            {admin && <Button size="small" href={`/orders/${item.orderId}`}>ดูใบสั่งซื้อ</Button>}
          </Stack>
          <ProductRow product={product} orderId={item.orderId} index={item.index} readOnlyDetails={!admin} previewImage decorSteps={decorSteps} />
        </Box>
      </Collapse>
    </Paper>
  );
}

export function DepartmentQueue({ items, stage, today, admin = true, decorSteps }: { admin?: boolean; items: DepartmentProduct[]; stage: ProductStatus; today: string; decorSteps?: string[] }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<QueueSort>("order");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const term = query.trim().toLocaleLowerCase("th-TH");
  const filtered = sortQueue(items.filter(({ product, orderReference }) =>
    [product.styleCode, product.designName, product.material, orderReference, ...product.variants.map(v => v.color)]
      .some(value => value?.toLocaleLowerCase("th-TH").includes(term))), sort);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const allOpen = visible.length > 0 && visible.every(item => expanded.has(itemKey(item)));
  const toggle = (key: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (!next.delete(key)) next.add(key);
    return next;
  });

  return <Stack spacing={2}>
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
      <Chip label={`${formatNumber(items.length)} รายการสินค้า`} color="primary" />
      <Chip label={`ยอดสั่งรวม ${formatNumber(items.reduce((sum, item) => sum + productTotal(item.product), 0))} ตัว`} />
      <Button disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? "กำลังอัปเดต…" : "อัปเดตงานล่าสุด"}</Button>
    </Stack>
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField label="ค้นหารหัสสินค้า ชื่อลาย สี วัสดุ หรือเลขที่อ้างอิง" type="search" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} fullWidth size="small" />
      <TextField select label="เรียงลำดับ" value={sort} onChange={e => { setSort(e.target.value as QueueSort); setPage(1); }} size="small" sx={{ minWidth: 210 }}>
        {Object.entries(QUEUE_SORTS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
    </Stack>
    {!filtered.length ? <Paper sx={{ p: 4, textAlign: "center" }}><Typography>{query ? "ไม่พบสินค้าที่ตรงกับคำค้น" : stage === "sent" ? "ยังไม่มีสินค้าที่อยู่ในขั้นตอนส่งแล้ว" : "ยังไม่มีสินค้าที่ต้องทำในแผนกนี้"}</Typography></Paper> : <>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">พบ {formatNumber(filtered.length)} รายการ · กดที่รายการเพื่อดูตารางไซซ์และบันทึกงาน</Typography>
        <Button size="small" onClick={() => setExpanded(allOpen ? new Set() : new Set(visible.map(itemKey)))}>{allOpen ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}</Button>
      </Stack>
      <Stack spacing={1}>
        {visible.map(item => (
          <QueueItem key={itemKey(item)} item={item} today={today} admin={admin} decorSteps={decorSteps}
            open={expanded.has(itemKey(item))} onToggle={() => toggle(itemKey(item))} />
        ))}
      </Stack>
      {pages > 1 && <Pagination page={currentPage} count={pages} onChange={(_, value) => setPage(value)} />}
    </>}
  </Stack>;
}
