"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { ColorField } from "@/components/ColorField";
import { ProductTypeField } from "@/components/ProductTypeField";
import { WorkDetailsEditor } from "@/components/WorkDetailsEditor";
import { artworkSlots } from "@/lib/artworks";
import { ALL_SIZES, type Size } from "@/lib/order-sizes";
import { productTypeValue, legacyProductType, parseProductType } from "@/lib/product-type";
import { parseVariants } from "@/lib/product-variants";
import { sizeColumns, sizeLabel } from "@/lib/size-columns";
import { emptyWorkDetails, WORK_DETAIL_FIELDS } from "@/lib/work-details";
import type { OrderProduct, ProductionArtwork, WorkDetails } from "@/types/order";

type Row = { color: string; colorId?: string; sizes: Record<Size, string> };
const blankRow = (): Row => ({ color: "", sizes: Object.fromEntries(ALL_SIZES.map(size => [size, "0"])) as Row["sizes"] });

export function SkuEditControl({ orderId, index, product }: { orderId: string; index: number; product: OrderProduct }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [styleCode, setStyleCode] = useState("");
  const [designName, setDesignName] = useState("");
  const [productType, setProductType] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [details, setDetails] = useState<WorkDetails>(emptyWorkDetails);
  const [artworks, setArtworks] = useState<ProductionArtwork[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef("");
  const lastPayload = useRef("");
  const busy = saving || uploading;
  const legacyType = legacyProductType(product);
  const draftProduct = { productType, variants: rows };
  const columns = sizeColumns(draftProduct);

  function edit() {
    setStyleCode(product.styleCode);
    setDesignName(product.designName);
    setProductType(productTypeValue(product));
    setRows(product.variants.length ? product.variants.map(variant => ({ color: variant.color, colorId: variant.colorId,
      sizes: Object.fromEntries(ALL_SIZES.map(size => [size, String(variant.sizes[size] ?? 0)])) as Row["sizes"],
    })) : [blankRow()]);
    setDetails(Object.fromEntries(WORK_DETAIL_FIELDS.map(field => [field, product[field] ?? ""])) as unknown as WorkDetails);
    setArtworks(artworkSlots(product.artworks ?? []));
    setError(""); requestId.current = crypto.randomUUID(); lastPayload.current = ""; setOpen(true);
  }

  async function save() {
    if (busy) return;
    setError("");
    try {
      if (!styleCode.trim() || styleCode.trim().length > 120) throw new Error("กรุณาระบุรหัส SKU (ไม่เกิน 120 ตัวอักษร)");
      if (!designName.trim() || designName.trim().length > 200) throw new Error("กรุณาระบุชื่อลาย / ชื่องาน (ไม่เกิน 200 ตัวอักษร)");
      if (!parseProductType(productType)) throw new Error("กรุณาระบุประเภทเสื้อ (ไม่เกิน 120 ตัวอักษร)");
      const variants = parseVariants(rows.map(row => ({ color: row.color, colorId: row.colorId,
        sizes: Object.fromEntries(ALL_SIZES.map(size => [size, row.sizes[size].trim() === "" ? 0 : Number(row.sizes[size])])),
      })));
      const payload = JSON.stringify({ styleCode: styleCode.trim(), designName: designName.trim(), productType, variants, ...details, artworks });
      if (lastPayload.current && lastPayload.current !== payload) requestId.current = crypto.randomUUID();
      lastPayload.current = payload;
      setSaving(true);
      const response = await fetch(`/api/orders/${orderId}/products/${index}/details`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...JSON.parse(payload), requestId: requestId.current }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
      setOpen(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <>
    <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={edit}>แก้ไขสินค้า</Button>
    <Dialog open={open} onClose={() => { if (!busy) setOpen(false); }} fullWidth maxWidth="md" aria-labelledby={`product-edit-${orderId}-${index}`}>
      <DialogTitle id={`product-edit-${orderId}-${index}`}>แก้ไขสินค้า · {product.styleCode}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack spacing={1.5}>
            <Typography variant="h6">ข้อมูลสินค้า</Typography>
            <TextField label="รหัส SKU" required fullWidth value={styleCode} disabled={saving}
              slotProps={{ htmlInput: { maxLength: 120 } }} onChange={e => setStyleCode(e.target.value)} />
            <TextField label="ชื่อลาย / ชื่องาน" required fullWidth value={designName} disabled={saving}
              slotProps={{ htmlInput: { maxLength: 200 } }} onChange={e => setDesignName(e.target.value)} />
          </Stack>
          <Divider />
          <Stack spacing={1.5}>
            <Typography variant="h6">เลือกประเภทเสื้อ</Typography>
            {legacyType && <Alert severity="info">ประเภทเสื้อเดิมจากอีกช่อง: {legacyType}</Alert>}
            <ProductTypeField value={productType} disabled={saving} onChange={setProductType} />
          </Stack>
          <Divider />
          <Stack spacing={1.5}>
            <Typography variant="h6">แก้ไขสีและจำนวนตามไซซ์</Typography>
            {rows.map((row, i) => <Box key={i} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Stack spacing={2}>
                <ColorField color={row.color} colorId={row.colorId} disabled={saving} onChange={color => setRows(previous => previous.map((r, j) => i === j ? { ...r, ...color } : r))} />
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: `repeat(${columns.length}, 1fr)` }, gap: 1 }}>
                  {columns.map(size => <TextField key={size} label={sizeLabel(draftProduct, size)} type="number" size="small" value={row.sizes[size]} disabled={saving}
                    slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
                    onChange={e => setRows(previous => previous.map((r, j) => i === j ? { ...r, sizes: { ...r.sizes, [size]: e.target.value } } : r))} />)}
                </Box>
                <Button color="error" disabled={saving || rows.length === 1} onClick={() => setRows(previous => previous.filter((_, j) => j !== i))}>ลบสีนี้</Button>
              </Stack>
            </Box>)}
            <Button disabled={saving || rows.length >= 100} onClick={() => setRows(previous => [...previous, blankRow()])}>เพิ่มสี</Button>
          </Stack>
          <Divider />
          <Stack spacing={1.5}>
            <Typography variant="h6">แก้ไขรายละเอียดงาน</Typography>
            {open && <WorkDetailsEditor value={details} onChange={setDetails} disabled={saving} artworks={artworks}
              onArtworksChange={setArtworks} onArtworkBusyChange={setUploading} />}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={() => setOpen(false)}>ยกเลิก</Button>
        <Button variant="contained" disabled={busy} onClick={save}>{saving ? "กำลังบันทึก…" : uploading ? "กำลังอัปโหลด…" : "บันทึกทั้งหมด"}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
