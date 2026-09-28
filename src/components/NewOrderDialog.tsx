"use client";

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
  SIZES,
  DEFAULT_INSTRUCTIONS,
  type CreateOrderInput,
  type Size,
} from "@/types/order";
import { formatNumber } from "@/lib/format";
import { ProductImageUpload } from "@/components/ProductImageUpload";
import {
  FinishingsEditor,
  emptyFinishing,
  fromFinishingForm,
  type FinishingForm,
} from "@/components/FinishingsEditor";

type VariantForm = { color: string; sizes: Record<Size, string> };
type ProductForm = {
  styleCode: string;
  designName: string;
  productType: string;
  material: string;
  finishings: FinishingForm[];
  imageKey: string | null;
  variants: VariantForm[];
};

const emptySizes = (): Record<Size, string> =>
  SIZES.reduce((acc, s) => ({ ...acc, [s]: "" }), {} as Record<Size, string>);

const emptyVariant = (): VariantForm => ({ color: "", sizes: emptySizes() });

const emptyProduct = (): ProductForm => ({
  styleCode: "",
  designName: "",
  productType: "เสื้อยืดผู้ใหญ่ ยูนิเซ็กซ์",
  material: "",
  finishings: DEFAULT_INSTRUCTIONS.map((d) => emptyFinishing(d)),
  imageKey: null,
  variants: [emptyVariant()],
});

const today = () => new Date().toISOString().slice(0, 10);

function variantTotalOf(v: VariantForm): number {
  return SIZES.reduce((n, s) => n + (Number(v.sizes[s]) || 0), 0);
}

export function NewOrderDialog() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<ProductForm[]>([emptyProduct()]);

  function reset() {
    setTitle("");
    setReference("");
    setOrderDate(today());
    setNotes("");
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
    setError(null);
    if (!title.trim()) {
      setError("กรุณาระบุชื่อคำสั่งซื้อ");
      return;
    }

    const payloadProducts = products
      .filter((p) => p.styleCode.trim() && p.designName.trim())
      .map((p) => ({
        styleCode: p.styleCode.trim(),
        designName: p.designName.trim(),
        productType: p.productType.trim() || "เสื้อยืดผู้ใหญ่ ยูนิเซ็กซ์",
        material: p.material.trim() || undefined,
        finishings: p.finishings
          .map(fromFinishingForm)
          .filter((f) => f.description || f.imageKey),
        imageKey: p.imageKey ?? undefined,
        variants: p.variants
          .filter((v) => v.color.trim())
          .map((v) => ({
            color: v.color.trim(),
            sizes: SIZES.reduce(
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
        onClose={() => !saving && setOpen(false)}
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
                    <TextField
                      label="ประเภทสินค้า"
                      size="small"
                      fullWidth
                      value={product.productType}
                      onChange={(e) => patchProduct(pi, { productType: e.target.value })}
                    />
                  </Box>
                </Stack>

                {/* Colour variants + size grid */}
                <Stack spacing={1}>
                  {product.variants.map((variant, vi) => (
                    <Stack
                      key={vi}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <TextField
                        label="สี"
                        placeholder="กรมท่า"
                        size="small"
                        sx={{ width: 120 }}
                        value={variant.color}
                        onChange={(e) => patchVariant(pi, vi, { color: e.target.value })}
                      />
                      {SIZES.map((s) => (
                        <TextField
                          key={s}
                          label={s}
                          type="number"
                          size="small"
                          sx={{ width: 72 }}
                          slotProps={{ htmlInput: { min: 0 } }}
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
                  รายละเอียดงานตกแต่ง
                </Typography>
                <FinishingsEditor
                  value={product.finishings}
                  onChange={(finishings) => patchProduct(pi, { finishings })}
                />
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
          <Button onClick={() => setOpen(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? "กำลังสร้าง…" : "สร้างคำสั่งซื้อ"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
