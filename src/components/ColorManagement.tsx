"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, TextField, Typography } from "@mui/material";
import { parseColorInput, validColorHex, type ConfiguredColor } from "@/lib/color-config";
import { useFeedback } from "@/components/Feedback";

export function ColorManagement({ colors }: { colors: ConfiguredColor[] }) {
  const router = useRouter();
  const notify = useFeedback();
  const [open, setOpen] = useState(false);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#000000");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function edit(color?: ConfiguredColor) { setId(color?.id ?? ""); setName(color?.name ?? ""); setHex(color?.hex ?? "#000000"); setError(""); setOpen(true); }
  async function save() {
    setError("");
    try {
      const input = parseColorInput({ name, hex });
      setSaving(true);
      const response = await fetch(id ? `/api/colors/${id}` : "/api/colors", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || "บันทึกสีไม่สำเร็จ"); }
      setOpen(false); notify("บันทึกสีแล้ว"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกสีไม่สำเร็จ"); }
    finally { setSaving(false); }
  }
  return <Stack spacing={2}>
    <Button variant="contained" onClick={() => edit()} sx={{ alignSelf: "flex-start" }}>เพิ่มสี</Button>
    {!colors.length && <Alert severity="info">ยังไม่มีสี เพิ่มสีเพื่อเลือกใช้ในสินค้า</Alert>}
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
      {colors.map(color => <Paper key={color.id} sx={{ p: 2 }}><Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Box sx={{ width: 44, height: 44, flexShrink: 0, bgcolor: color.hex, borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{color.name}</Typography><Typography variant="body2" color="text.secondary">{color.hex}</Typography></Box>
        <Button onClick={() => edit(color)} aria-label={`แก้ไขสี ${color.name}`}>แก้ไข</Button>
      </Stack></Paper>)}
    </Box>
    <Dialog open={open} onClose={() => { if (!saving) setOpen(false); }} fullWidth maxWidth="xs" aria-labelledby="color-editor-title">
      <DialogTitle id="color-editor-title">{id ? "แก้ไขสี" : "เพิ่มสี"}</DialogTitle>
      <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="ชื่อสี" required value={name} disabled={saving} onChange={e => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box component="input" type="color" aria-label="เลือกสี" value={validColorHex(hex) ? hex : "#000000"} disabled={saving} onChange={e => setHex(e.target.value.toUpperCase())} sx={{ width: 64, height: 48, flexShrink: 0 }} />
          <TextField label="รหัสสี HEX" required value={hex} disabled={saving} onChange={e => setHex(e.target.value)} placeholder="#1E293B" fullWidth />
        </Stack>
        {id && <Typography variant="caption" color="text.secondary">เมื่อแก้ไข สีที่แสดงบนเว็บและ PDF ของสินค้าที่เลือกสีนี้จะเปลี่ยนตาม</Typography>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={saving} onClick={() => setOpen(false)}>ยกเลิก</Button><Button disabled={saving} variant="contained" onClick={save}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button></DialogActions>
    </Dialog>
  </Stack>;
}
