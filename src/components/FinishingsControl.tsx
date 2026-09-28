"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import {
  FinishingsEditor,
  fromFinishingForm,
  toFinishingForm,
  type FinishingForm,
} from "@/components/FinishingsEditor";
import { productImageSrc, type Finishing } from "@/types/order";
import { thaiDefault } from "@/lib/thai";

function FinishingItem({ finishing }: { finishing: Finishing }) {
  const src = productImageSrc(finishing);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
      {src && (
        <Box
          sx={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={thaiDefault(finishing.description) || "ภาพตัวอย่างงานตกแต่ง"}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </Box>
      )}
      <Typography variant="caption" sx={{ pt: src ? 0.5 : 0 }}>
        {src ? thaiDefault(finishing.description) : `• ${thaiDefault(finishing.description)}`}
      </Typography>
    </Stack>
  );
}

/**
 * Finishing panel on the production sheet: shows each step's photo and
 * description, and persists edits against this product of a saved order.
 */
export function FinishingsControl({
  orderId,
  index,
  finishings,
}: {
  orderId: string;
  index: number;
  finishings: Finishing[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FinishingForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setDraft(finishings.map(toFinishingForm));
    setError(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/products/${index}/finishings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finishings: draft.map(fromFinishingForm) }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "บันทึกรายการงานตกแต่งไม่สำเร็จ");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("บันทึกรายการงานตกแต่งไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        รายละเอียดงานตกแต่ง
      </Typography>

      {editing ? (
        <>
          <FinishingsEditor value={draft} onChange={setDraft} disabled={saving} />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disabled={saving} onClick={save}>
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
            <Button size="small" disabled={saving} onClick={() => setEditing(false)}>
              ยกเลิก
            </Button>
          </Stack>
        </>
      ) : (
        <>
          <Stack spacing={1}>
            {finishings.map((finishing, i) => (
              <FinishingItem key={i} finishing={finishing} />
            ))}
            {finishings.length === 0 && (
              <Typography variant="caption" color="text.secondary">
                ไม่มีรายการ
              </Typography>
            )}
          </Stack>
          <Box>
            <Button
              size="small"
              color="inherit"
              startIcon={<EditOutlinedIcon fontSize="small" />}
              onClick={startEditing}
              sx={{ fontSize: 12, minHeight: 0, py: 0.25 }}
            >
              แก้ไข
            </Button>
          </Box>
        </>
      )}

      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
