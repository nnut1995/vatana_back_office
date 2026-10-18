"use client";
import { ALL_SIZES, emptySizeInputs } from "@/lib/order-sizes";

import { sizeColumns, sizeLabel } from "@/lib/size-columns";

import { ColorField } from "@/components/ColorField";
import { ProductTypeField } from "@/components/ProductTypeField";
import { parseProductType } from "@/lib/product-type";

import { WorkDetailsEditor } from "@/components/WorkDetailsEditor";
import { ProductTypeBadge } from "@/components/ProductTypeBadge";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { 
  type WorkDetails,
  type ProductionArtwork,
  type CreateOrderInput,
  type Size,
} from "@/types/order";
import { formatNumber } from "@/lib/format";
import { ProductImageUpload } from "@/components/ProductImageUpload";
type VariantForm = { color: string; colorId?: string; sizes: Record<Size, string> };
type ProductForm = WorkDetails & {
  styleCode: string;
  designName: string;
  productType: string;
  material: string;
  artworks: ProductionArtwork[];
  imageKey: string | null;
  variants: VariantForm[];
};

// Keep initialization in the dependency-free runtime module with its size values.
const emptySizes = emptySizeInputs;

const emptyVariant = (): VariantForm => ({ color: "", sizes: emptySizes() });

const emptyProduct = (): ProductForm => ({
  styleCode: "",
  designName: "",
  productType: "",
  material: "",
  artworks: [{ caption: "Print On" }, { caption: "Tag on Size Label" }, { caption: "Stick on T-shirt" }],
  workFront: "",
  workBack: "",
  workSleeves: "",
  productionSteps: "",
  workRemark: "",
  imageKey: null,
  variants: [emptyVariant()],
});

const today = () => new Date().toISOString().slice(0, 10);

function variantTotalOf(v: VariantForm): number {
  return ALL_SIZES.reduce((n, s) => n + (Number(v.sizes[s]) || 0), 0);
}

export function NewOrderDialog() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [artworkUploads, setArtworkUploads] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<ProductForm[]>([emptyProduct()]);

  function reset() {
    setTitle("");
    setReference("");
    setOrderDate(today());
    setNotes("");
    setDeliveryDate("");
    setProducts([emptyProduct()]);
    setError(null);
  }

  function patchProduct(pi: number, patch: Partial<ProductForm>) {
    setProducts((prev) => prev.map((p, i) => (i === pi ? { ...p, ...patch } : p)));
  }
  function patchVariant(pi: number, vi: number, patch: Partial<VariantForm>) {
    setProducts((prev) =>
      prev.map((p, i) =>
        i === pi
          ? { ...p, variants: p.variants.map((v, j) => (j === vi ? { ...v, ...patch } : v)) }
          : p,
      ),
    );
  }
  function patchSize(pi: number, vi: number, size: Size, value: string) {
    setProducts((prev) =>
      prev.map((p, i) =>
        i === pi
          ? {
              ...p,
              variants: p.variants.map((v, j) =>
                j === vi ? { ...v, sizes: { ...v.sizes, [size]: value } } : v,
              ),
            }
          : p,
      ),
    );
  }

  const grandTotal = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + variantTotalOf(v), 0),
    0,
  );

  async function handleSubmit() {
    if (artworkUploads.length) return;
    setError(null);
    if (!title.trim()) {
      setError("กรุณาระบุชื่อคำสั่งซื้อ");
      return;
    }

    if (products.some((p) => !parseProductType(p.productType))) {
      setError("กรุณาระบุประเภทเสื้อให้สินค้าทุกรายการ (ไม่เกิน 120 ตัวอักษร)");
      return;
    }

    const payloadProducts = products
      .filter((p) => p.styleCode.trim() && p.designName.trim())
      .map((p) => ({
        styleCode: p.styleCode.trim(),
        designName: p.designName.trim(),
        productType: p.productType.trim(),
        material: p.material.trim() || undefined,
        artworks: p.artworks.filter(a => a.imageKey || a.caption.trim()),
        workFront: p.workFront,
        workBack: p.workBack,
        workSleeves: p.workSleeves,
        productionSteps: p.productionSteps,
        workRemark: p.workRemark,
        imageKey: p.imageKey ?? undefined,
        variants: p.variants
          .filter((v) => v.color.trim())
          .map((v) => ({
            color: v.color.trim(),
            colorId: v.colorId,
            sizes: ALL_SIZES.reduce(
              (acc, s) => ({ ...acc, [s]: Number(v.sizes[s]) || 0 }),
              {},
            ),
          })),
      }))
      .filter((p) => p.variants.length > 0);

    if (payloadProducts.length === 0) {
      setError("กรุณาเพิ่มสินค้าอย่างน้อยหนึ่งรายการ พร้อมรหัสสินค้า ชื่อลาย และสี");
      return;
    }

    const body: CreateOrderInput = {
      title: title.trim(),
      reference: reference.trim() || undefined,
      orderDate,
      deliveryDate: deliveryDate || undefined,
      notes: notes.trim() || undefined,
      products: payloadProducts,
    };

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "สร้างคำสั่งซื้อไม่สำเร็จ");
        return;
      }
      const data = await res.json();
      setOpen(false);
      reset();
      startTransition(() => router.push(`/orders/${data.order._id}`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
        สร้างคำสั่งซื้อ
      </Button>

      <Dialog
        open={open}
        onClose={() => !saving && !artworkUploads.length && setOpen(false)}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle>สร้างคำสั่งผลิต</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Order header */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="ชื่อคำสั่งซื้อ"
              placeholder="เช่น เสื้อทีมแข่ง รุ่นผู้ใหญ่"
              fullWidth
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="เลขที่อ้างอิง"
              placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ"
              sx={{ minWidth: 180 }}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <TextField
              label="วันที่สั่งซื้อ"
              type="date"
              sx={{ minWidth: 170 }}
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </Stack>

          <TextField label="กำหนดส่ง" type="date" value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
            sx={{ mb: 2 }} />

          {/* Products */}
          <Typography variant="subtitle2" gutterBottom>
            สินค้า
          </Typography>
          <Stack spacing={2}>
            {products.map((product, pi) => (
              <Paper key={pi} variant="outlined" sx={{ p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    สินค้า {pi + 1}
                  </Typography>
                  <IconButton
                    aria-label={`ลบสินค้าที่ ${pi + 1}`}
                    size="small"
                    disabled={products.length === 1}
                    onClick={() =>
                      setProducts((prev) => prev.filter((_, i) => i !== pi))
                    }
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{ mb: 2, alignItems: { xs: "center", sm: "flex-start" } }}
                >
                  <ProductImageUpload
                    imageKey={product.imageKey}
                    alt={product.designName || `สินค้า ${pi + 1}`}
                    onChange={(key) => patchProduct(pi, { imageKey: key })}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0, width: "100%" }}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1.5}
                      sx={{ mb: 1.5 }}
                    >
                      <TextField
                        label="รหัสสินค้า"
                        placeholder="MLS1035"
                        size="small"
                        sx={{ flex: 1 }}
                        value={product.styleCode}
                        onChange={(e) => patchProduct(pi, { styleCode: e.target.value })}
                      />
                      <TextField
                        label="ชื่อลาย"
                        placeholder="เช่น ลายพิมพ์สีน้ำเงิน"
                        size="small"
                        sx={{ flex: 2 }}
                        value={product.designName}
                        onChange={(e) => patchProduct(pi, { designName: e.target.value })}
                      />
                      <TextField
                        label="วัสดุ"
                        placeholder="TPU"
                        size="small"
                        sx={{ flex: 1 }}
                        value={product.material}
                        onChange={(e) => patchProduct(pi, { material: e.target.value })}
                      />
                    </Stack>
                    <Box sx={{ mb: 1 }}><ProductTypeBadge productType={product.productType} /></Box>
                    <ProductTypeField value={product.productType} disabled={saving}
                      onChange={(productType) => patchProduct(pi, { productType })} />
                  </Box>
                </Stack>

                {/* Colour variants + size grid */}
                <Stack spacing={1}>
                  {product.variants.map((variant, vi) => (
                    <Stack
                      key={vi}
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ alignItems: "center", flexWrap: "wrap" }}
                    >
                      <Box sx={{ width: 230, maxWidth: "100%" }}>
                        <ColorField color={variant.color} colorId={variant.colorId} disabled={saving}
                          onChange={color => patchVariant(pi, vi, color)} />
                      </Box>
                      {sizeColumns(product).map((s) => (
                        <TextField
                          key={s}
                          label={sizeLabel(product, s)}
                          type="number"
                          size="small"
                          sx={{ width: 72 }}
                          slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }}
                          value={variant.sizes[s]}
                          onChange={(e) => patchSize(pi, vi, s, e.target.value)}
                        />
                      ))}
                      <Box sx={{ width: 64, textAlign: "right" }}>
                        <Typography variant="caption" color="text.secondary">
                          รวม
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {formatNumber(variantTotalOf(variant))}
                        </Typography>
                      </Box>
                      <IconButton
                        aria-label={`ลบสีที่ ${vi + 1} ของสินค้าที่ ${pi + 1}`}
                        size="small"
                        disabled={product.variants.length === 1}
                        onClick={() =>
                          patchProduct(pi, {
                            variants: product.variants.filter((_, j) => j !== vi),
                          })
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{ mt: 1 }}
                  onClick={() =>
                    patchProduct(pi, { variants: [...product.variants, emptyVariant()] })
                  }
                >
                  เพิ่มสี
                </Button>

                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                  รายละเอียดงาน
                </Typography>
                <WorkDetailsEditor value={product} onChange={(details) => patchProduct(pi, details)} disabled={saving}
                  onArtworkBusyChange={busy => setArtworkUploads(current => busy ? [...new Set([...current, pi])] : current.filter(i => i !== pi))}
                  artworks={product.artworks} onArtworksChange={(artworks) => patchProduct(pi, { artworks })} />
              </Paper>
            ))}
          </Stack>
          <Button
            startIcon={<AddIcon />}
            sx={{ mt: 1.5 }}
            onClick={() => setProducts((prev) => [...prev, emptyProduct()])}
          >
            เพิ่มสินค้า
          </Button>

          <Divider sx={{ my: 2 }} />
          <TextField
            label="หมายเหตุคำสั่งซื้อ (ไม่บังคับ)"
            fullWidth
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, alignItems: "baseline", mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              รวมทั้งหมด
            </Typography>
            <Typography variant="h6">{formatNumber(grandTotal)} ชิ้น</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving || artworkUploads.length > 0}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving || artworkUploads.length > 0}>
            {saving ? "กำลังสร้าง…" : "สร้างคำสั่งซื้อ"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
