"use client";
import { createContext, useContext } from "react";
import { Box, MenuItem, TextField } from "@mui/material";
import type { ConfiguredColor } from "@/lib/color-config";
const ColorContext = createContext<ConfiguredColor[]>([]);
export function ColorProvider({ colors, children }: { colors: ConfiguredColor[]; children: React.ReactNode }) {
  return <ColorContext.Provider value={colors}>{children}</ColorContext.Provider>;
}
export function ColorField({ colorId, color, onChange, disabled = false }: {
  colorId?: string; color: string; onChange: (color: { color: string; colorId?: string }) => void; disabled?: boolean;
}) {
  const colors = useContext(ColorContext);
  const selected = colors.find(c => c.id === colorId) ?? (!colorId ? colors.find(c => c.name.toLowerCase() === color.trim().toLowerCase()) : undefined);
  const legacy = !selected && Boolean(color);
  return <TextField select label="สี" size="small" fullWidth disabled={disabled} value={selected?.id ?? (legacy ? "legacy" : "")}
    helperText={!colors.length ? "เพิ่มสีในหน้าตั้งค่าสีก่อนเลือกสี" : legacy ? "สีเดิมยังไม่ได้กำหนด เลือกสีจากรายการเพื่อเชื่อมกับการตั้งค่า" : undefined}
    onChange={e => { const next = colors.find(c => c.id === e.target.value); if (next) onChange({ color: next.name, colorId: next.id }); }}>
    <MenuItem value="" disabled>เลือกสี</MenuItem>
    {legacy && <MenuItem value="legacy" disabled>{color} (สีเดิม)</MenuItem>}
    {colors.map(c => <MenuItem key={c.id} value={c.id}><Box component="span" sx={{ width: 16, height: 16, flexShrink: 0, borderRadius: "50%", border: "1px solid #ccc", bgcolor: c.hex, mr: 1 }} />{c.name} · {c.hex}</MenuItem>)}
  </TextField>;
}
