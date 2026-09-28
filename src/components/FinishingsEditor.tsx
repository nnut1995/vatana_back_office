"use client";

import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { ProductImageUpload } from "@/components/ProductImageUpload";
import type { Finishing } from "@/types/order";
import { thaiDefault } from "@/lib/thai";

/** A finishing while it is being edited: `imageKey` is null until one is picked. */
export interface FinishingForm {
  description: string;
  imageKey: string | null;
  imageUrl?: string;
}

export const emptyFinishing = (description = ""): FinishingForm => ({
  description,
  imageKey: null,
});

export function toFinishingForm(finishing: Finishing): FinishingForm {
  return {
    description: thaiDefault(finishing.description),
    imageKey: finishing.imageKey ?? null,
    imageUrl: finishing.imageUrl,
  };
}

export function fromFinishingForm(form: FinishingForm): Finishing {
  return {
    description: form.description.trim(),
    imageKey: form.imageKey ?? undefined,
    imageUrl: form.imageUrl,
  };
}

/**
 * Editable list of finishing steps for one product — each a photo plus the
 * instruction that goes with it. Fully controlled, so the parent decides
 * whether the result is held in a form or persisted straight away.
 */
export function FinishingsEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: FinishingForm[];
  onChange: (next: FinishingForm[]) => void;
  disabled?: boolean;
}) {
  function patch(index: number, changes: Partial<FinishingForm>) {
    onChange(value.map((f, i) => (i === index ? { ...f, ...changes } : f)));
  }

  return (
    <Stack spacing={1}>
      {/* One finishing per row: photo, description, remove. */}
      {value.map((finishing, i) => (
        <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ProductImageUpload
            compact
            imageKey={finishing.imageKey}
            fallbackSrc={finishing.imageUrl}
            alt={finishing.description || `งานตกแต่ง ${i + 1}`}
            size={56}
            disabled={disabled}
            onChange={(key) => patch(i, { imageKey: key })}
          />
          <TextField
            placeholder="รายละเอียด เช่น พิมพ์ลาย"
            size="small"
            fullWidth
            disabled={disabled}
            value={finishing.description}
            onChange={(e) => patch(i, { description: e.target.value })}
            sx={{ minWidth: 0 }}
          />
          <IconButton
            size="small"
            disabled={disabled}
            aria-label={`ลบงานตกแต่ง ${i + 1}`}
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      {value.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          ยังไม่มีรายการงานตกแต่ง
        </Typography>
      )}

      <Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={disabled}
          onClick={() => onChange([...value, emptyFinishing()])}
        >
          เพิ่มงานตกแต่ง
        </Button>
      </Box>
    </Stack>
  );
}
