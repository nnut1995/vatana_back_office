"use client";

import { ArtworkEditor } from "@/components/ArtworkEditor";
import { useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import type { WorkDetails, ProductionArtwork } from "@/types/order";

export function WorkDetailsEditor({ value, onChange, disabled = false, artworks, onArtworksChange, onArtworkBusyChange }: {
  value: WorkDetails; onChange: (value: WorkDetails) => void; disabled?: boolean;
  onArtworkBusyChange?: (busy: boolean) => void;
  artworks?: ProductionArtwork[]; onArtworksChange?: (value: ProductionArtwork[]) => void;
}) {
  const [remarkOpen, setRemarkOpen] = useState(Boolean(value.workRemark));
  return <Stack spacing={1.5}>
    <Typography variant="subtitle2">1. ภาพรวมงาน</Typography>
    {([
      ["workFront", "หน้า", "เช่น พิมพ์ + GLOW"],
      ["workBack", "หลัง", "เช่น ทรานสเฟอร์"],
      ["workSleeves", "แขน", "เช่น ทรานสเฟอร์ทั้งสองข้าง"],
    ] as const).map(([key, label, placeholder]) => <TextField key={key}
      label={label} placeholder={placeholder} multiline fullWidth size="small"
      disabled={disabled} value={value[key]} slotProps={{ htmlInput: { maxLength: 5000 } }}
      onChange={(e) => onChange({ ...value, [key]: e.target.value })} />)}
    <Typography variant="subtitle2" sx={{ pt: 1 }}>2. ขั้นตอนการผลิต</Typography>
    <TextField label="ลำดับงานและแผนกที่รับผิดชอบ" multiline minRows={3} fullWidth size="small"
      placeholder={"1. พิมพ์หน้าที่แผนกพิมพ์\n2. พิมพ์หลัง + แขนที่แผนกตกแต่ง"}
      disabled={disabled} value={value.productionSteps} slotProps={{ htmlInput: { maxLength: 5000 } }}
      onChange={(e) => onChange({ ...value, productionSteps: e.target.value })} />
    {remarkOpen || value.workRemark ? <>
      <TextField label="หมายเหตุงานพิเศษ (ไม่บังคับ)" multiline minRows={2} fullWidth size="small"
        placeholder="ข้อควรระวังสำหรับงานที่ซับซ้อน" disabled={disabled} value={value.workRemark}
        slotProps={{ htmlInput: { maxLength: 5000 } }}
        onChange={(e) => onChange({ ...value, workRemark: e.target.value })} />
      <Button size="small" disabled={disabled} sx={{ alignSelf: "flex-start" }} onClick={() => {
        onChange({ ...value, workRemark: "" }); setRemarkOpen(false);
      }}>ลบหมายเหตุ</Button>
    </> : <Button size="small" disabled={disabled} sx={{ alignSelf: "flex-start" }}
      onClick={() => setRemarkOpen(true)}>+ เพิ่มหมายเหตุงานพิเศษ</Button>}
    {onArtworksChange && <>
      <Typography variant="subtitle2" sx={{ pt: 1 }}>3. Print On / รูปประกอบและป้าย</Typography>
      <ArtworkEditor value={artworks ?? []} onChange={onArtworksChange} disabled={disabled} onBusyChange={onArtworkBusyChange} />
    </>}
  </Stack>;
}
