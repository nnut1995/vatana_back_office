'use client';
import { ColorField } from "@/components/ColorField";
import { ALL_SIZES } from "@/lib/order-sizes";

import { sizeColumns, sizeLabel } from '@/lib/size-columns';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import {  type ColorVariant } from '@/types/order';
import { parseVariants } from '@/lib/product-variants';
type Row = { color: string; colorId?: string; sizes: Record<(typeof ALL_SIZES)[number], string> };
const blank = (): Row => ({ color: '', sizes: { XS: '0', S: '0', M: '0', L: '0', XL: '0', XXL: '0' } });
export function ProductVariantsControl({ orderId, index, variants, productType }: { productType: string; orderId: string; index: number; variants: ColorVariant[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef('');
  function edit() {
    setRows(variants.map(v => ({ color: v.color, colorId: v.colorId, sizes: Object.fromEntries(ALL_SIZES.map(s => [s, String(v.sizes[s] ?? 0)])) as Row['sizes'] })));
    requestId.current = crypto.randomUUID(); setError(''); setOpen(true);
  }
  function change(next: Row[]) { setRows(next); requestId.current = crypto.randomUUID(); }
  async function save() {
    setSaving(true); setError('');
    try {
      const data = parseVariants(rows.map(r => ({ color: r.color, colorId: r.colorId, sizes: Object.fromEntries(ALL_SIZES.map(s => [s, r.sizes[s].trim() === '' ? 0 : Number(r.sizes[s])])) })));
      const response = await fetch(`/api/orders/${orderId}/products/${index}/variants`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ variants: data, requestId: requestId.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'บันทึกไม่สำเร็จ');
      setOpen(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  }
  return <>
    <Button size="small" onClick={edit}>แก้ไขสี / จำนวนตามไซซ์</Button>
    <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="md"><DialogTitle>แก้ไขสีและจำนวนตามไซซ์</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Typography variant="body2" color="text.secondary">ปรับจำนวนที่สั่งของสินค้า ประวัติยอดรับเข้า ส่งออก และเสียที่บันทึกไว้จะคงเดิม ทุกการแก้ไขเก็บในประวัติสินค้า</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {rows.map((row, i) => <Box key={i} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}><Stack spacing={2}>
        <ColorField color={row.color} colorId={row.colorId} disabled={saving} onChange={color => change(rows.map((r, j) => i === j ? { ...r, ...color } : r))} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 1 }}>{sizeColumns({ productType, variants: rows }).map(size => <TextField key={size} label={sizeLabel({ productType }, size)} type="number" size="small" value={row.sizes[size]} disabled={saving} slotProps={{ htmlInput: { min: 0, step: 1 }, inputLabel: { shrink: true } }} onChange={e => change(rows.map((r, j) => i === j ? { ...r, sizes: { ...r.sizes, [size]: e.target.value } } : r))} />)}</Box>
        <Button color="error" disabled={saving || rows.length === 1} onClick={() => change(rows.filter((_, j) => j !== i))}>ลบสีนี้</Button>
      </Stack></Box>)}
      <Button disabled={saving || rows.length >= 100} onClick={() => change([...rows, blank()])}>เพิ่มสี</Button>
    </Stack></DialogContent><DialogActions><Button disabled={saving} onClick={() => setOpen(false)}>ยกเลิก</Button><Button variant="contained" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button></DialogActions></Dialog>
  </>;
}
