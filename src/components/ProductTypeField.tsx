"use client";

import { Autocomplete, TextField } from "@mui/material";
import { GARMENT_TYPES } from "@/types/order";

export function ProductTypeField({ value, onChange, disabled = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  return <Autocomplete freeSolo openOnFocus forcePopupIcon clearOnBlur={false}
    options={GARMENT_TYPES} value={value || null} inputValue={value} disabled={disabled}
    onInputChange={(_, text, reason) => { if (reason !== "reset") onChange(text); }}
    onChange={(_, text) => onChange(text ?? "")}
    openText="ประเภทที่ใช้บ่อย" closeText="ปิดรายการ" clearText="ล้างค่า"
    renderInput={(params) => <TextField {...params} label="ประเภทเสื้อ" required size="small"
      helperText="พิมพ์เอง หรือเลือกประเภทที่ใช้บ่อย เช่น เสื้อเด็ก / เสื้อผู้ใหญ่ / ผู้ใหญ่-ผ้าตัว"
      slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, maxLength: 120 } }} />} />;
}
