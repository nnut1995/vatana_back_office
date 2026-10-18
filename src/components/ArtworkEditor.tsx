"use client";
import { useEffect, useRef } from "react";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { ProductImageUpload } from "@/components/ProductImageUpload";
import { ARTWORK_CAPTIONS, artworkSlots } from "@/lib/artworks";
import type { ProductionArtwork } from "@/types/order";

export function ArtworkEditor({ value, onChange, disabled = false, onBusyChange }: {
  value: ProductionArtwork[]; onChange: (value: ProductionArtwork[]) => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const slots = artworkSlots(value);
  const latest = useRef(slots);
  useEffect(() => { latest.current = artworkSlots(value); }, [value]);
  const uploads = useRef(new Set<number>());
  function patch(index: number, next: ProductionArtwork) {
    const updated = latest.current.map((artwork, i) => i === index ? next : artwork);
    latest.current = updated; onChange(updated);
  }
  return <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
    {slots.map((artwork, index) => <Box component="fieldset" key={index} sx={{ m: 0, p: 1.5, minWidth: 0, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
      <Typography component="legend" variant="caption">{ARTWORK_CAPTIONS[index]}</Typography>
      <Stack spacing={1}>
        <ProductImageUpload imageKey={artwork.imageKey ?? null} fallbackSrc={artwork.imageUrl}
          size={104} alt={artwork.caption || ARTWORK_CAPTIONS[index]} disabled={disabled}
          onBusyChange={busy => { if (busy) uploads.current.add(index); else uploads.current.delete(index); onBusyChange?.(uploads.current.size > 0); }}
          onChange={key => patch(index, { caption: latest.current[index].caption, ...(key ? { imageKey: key } : {}) })} />
        <TextField label={`ข้อความ ${ARTWORK_CAPTIONS[index]}`} size="small" fullWidth disabled={disabled}
          value={artwork.caption} slotProps={{ htmlInput: { maxLength: 120 } }}
          onChange={e => patch(index, { ...latest.current[index], caption: e.target.value })} />
      </Stack>
    </Box>)}
  </Box>;
}
