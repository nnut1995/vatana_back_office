"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { productImageSrc } from "@/types/order";
import { formatNumber } from "@/lib/format";

interface UploadResult {
  key: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
}

export interface ProductImageUploadProps {
  /** S3 key of the current photo, or null when the product has none. */
  imageKey: string | null;
  /** Called with the new key after a successful upload, or null on remove. */
  onChange: (key: string | null) => void | Promise<void>;
  /** Externally hosted photo to show while there is no uploaded `imageKey`. */
  fallbackSrc?: string;
  alt?: string;
  size?: number;
  disabled?: boolean;
  /**
   * Drop the caption and the standalone Remove button, and clear the photo from
   * a small overlay instead, so the picker is exactly `size` tall — for slots
   * that sit inline in a single row.
   */
  compact?: boolean;
}

/**
 * Click-or-drop photo picker for a single product. Uploads to `/api/uploads`,
 * which optimizes the image and stores it in S3, then hands the resulting
 * object key back to the parent — the parent decides how to persist it.
 */
export function ProductImageUpload({
  imageKey,
  onChange,
  fallbackSrc,
  alt = "รูปสินค้า",
  size = 120,
  disabled = false,
  compact = false,
}: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const src = productImageSrc({
    imageKey: imageKey ?? undefined,
    imageUrl: fallbackSrc,
  });
  const locked = busy || disabled;

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("กรุณาเลือกไฟล์รูปภาพ");
      return;
    }

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "อัปโหลดไม่สำเร็จ");
        return;
      }
      setResult(data as UploadResult);
      await onChange(data.key);
    } catch {
      setError("อัปโหลดไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      await onChange(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={0.75} sx={{ alignItems: "center" }}>
      <Box
        onClick={() => !locked && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!locked) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !locked) void upload(file);
        }}
        sx={{
          width: size,
          height: size,
          borderRadius: 2,
          border: "1px dashed",
          borderColor: dragOver ? "primary.main" : error ? "error.main" : "divider",
          bgcolor: dragOver ? "action.hover" : "background.paper",
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          position: "relative",
          cursor: locked ? "default" : "pointer",
          transition: "border-color 120ms, background-color 120ms",
          "&:hover": locked ? undefined : { borderColor: "primary.main" },
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity: busy ? 0.4 : 1,
            }}
          />
        ) : (
          <Stack sx={{ alignItems: "center", color: "text.secondary", px: 1 }}>
            <AddPhotoAlternateOutlinedIcon fontSize="small" />
            {!compact && (
              <Typography variant="caption" align="center" sx={{ lineHeight: 1.3, mt: 0.5 }}>
                คลิกหรือลากรูปมาวาง
              </Typography>
            )}
          </Stack>
        )}

        {busy && (
          <CircularProgress size={24} sx={{ position: "absolute" }} />
        )}

        {compact && src && !locked && (
          <IconButton
            size="small"
            aria-label="ลบรูปภาพ"
            onClick={(e) => {
              e.stopPropagation();
              void remove();
            }}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              p: 0.25,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { bgcolor: "background.paper" },
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        )}
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so re-picking the same file fires change again.
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      {src && !compact && (
        <Button
          size="small"
          color="inherit"
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          disabled={locked}
          onClick={remove}
          sx={{ fontSize: 12, minHeight: 0, py: 0.25 }}
        >
          ลบ
        </Button>
      )}

      {error ? (
        <Typography variant="caption" color="error" align="center" sx={{ maxWidth: size + 40 }}>
          {error}
        </Typography>
      ) : (
        result &&
        !compact && (
          <Typography variant="caption" color="text.secondary" align="center">
            {result.width}×{result.height} · {formatNumber(Math.round(result.bytes / 1024))} กิโลไบต์
          </Typography>
        )
      )}
    </Stack>
  );
}
