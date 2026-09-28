"use client";

import { useState } from "react";
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { productImageSrc, type ImageRef } from "@/types/order";

export function ProductImagePreview({ image, alt }: { image: ImageRef; alt: string }) {
  const [open, setOpen] = useState(false);
  const src = productImageSrc(image);
  if (!src) return <Box sx={{ width: 104, height: 104, display: "grid", placeItems: "center", border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Typography variant="caption" color="text.secondary">ยังไม่มีรูปสินค้า</Typography></Box>;
  return <>
    <ButtonBase aria-label={`ขยายรูป ${alt}`} onClick={() => setOpen(true)} sx={{ width: 104, height: 104, borderRadius: 2, overflow: "hidden", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", cursor: "zoom-in" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </ButtonBase>
    <Typography variant="caption" color="text.secondary">กดรูปเพื่อขยาย</Typography>
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
      <DialogTitle>{alt}</DialogTitle>
      <DialogContent sx={{ textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ maxWidth: "100%", maxHeight: "75vh", objectFit: "contain" }} />
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>ปิด</Button></DialogActions>
    </Dialog>
  </>;
}
