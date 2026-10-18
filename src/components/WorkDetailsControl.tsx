"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { WorkDetailsEditor } from "@/components/WorkDetailsEditor";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { artworkSlots } from "@/lib/artworks";
import type { WorkDetails, ProductionArtwork } from "@/types/order";
import { useFeedback } from "@/components/Feedback";

export function WorkDetailsControl({ orderId, index, workFront = "", workBack = "", workSleeves = "",
  productionSteps = "", workRemark = "", artworks = [], readOnly = false }: Partial<WorkDetails> & {
    orderId: string; index: number; artworks?: ProductionArtwork[]; readOnly?: boolean;
  }) {
  const router = useRouter();
  const notify = useFeedback();
  const current = { workFront, workBack, workSleeves, productionSteps, workRemark };
  const [draft, setDraft] = useState<WorkDetails>(current);
  const [draftArtworks, setDraftArtworks] = useState(() => artworkSlots(artworks));
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef("");

  async function save() {
    if (uploading) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/products/${index}/work-details`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, artworks: draftArtworks, requestId: requestId.current }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "บันทึกรายละเอียดงานไม่สำเร็จ");
        return;
      }
      setEditing(false); notify("บันทึกรายละเอียดงานแล้ว"); router.refresh();
    } catch {
      setError("บันทึกรายละเอียดงานไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally { setSaving(false); }
  }

  return <>
    <Stack spacing={1.5} sx={{ overflowWrap: "anywhere" }}>
      <Typography variant="subtitle2">รายละเอียดงาน</Typography>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>1. ภาพรวมงาน</Typography>
        <Stack component="dl" spacing={0.75} sx={{ m: 0 }}>
          {[["หน้า", workFront], ["หลัง", workBack], ["แขน", workSleeves]].map(([label, text]) => (
            <Box key={label} sx={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr)", gap: 1 }}>
              <Typography component="dt" variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
              <Typography component="dd" variant="body2" color={text ? "text.primary" : "text.secondary"}
                sx={{ m: 0, whiteSpace: "pre-wrap" }}>{text || "ยังไม่ระบุ"}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
      <Divider />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>2. ขั้นตอนการผลิต</Typography>
        <Typography variant="body2" color={productionSteps ? "text.primary" : "text.secondary"}
          sx={{ whiteSpace: "pre-wrap" }}>{productionSteps || "ยังไม่ระบุขั้นตอน"}</Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>3. Print On / รูปประกอบและป้าย</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 110px), 1fr))", gap: 1 }}>
          {artworks.map((artwork, i) => <Stack key={i} spacing={0.5} sx={{ minWidth: 0, alignItems: "center" }}>
            {artwork.imageKey || artwork.imageUrl
              ? <ProductImagePreview image={artwork} alt={artwork.caption || `รูปประกอบ ${i + 1}`} size={96} showHint={false} />
              : <Typography variant="caption" color="text.secondary">ยังไม่มีรูป</Typography>}
            <Typography variant="caption" sx={{ textAlign: "center", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{artwork.caption}</Typography>
          </Stack>)}
          {!artworks.length && <Typography variant="caption" color="text.secondary">ยังไม่มีรูปประกอบ</Typography>}
        </Box>
      </Box>
      {workRemark && <Box sx={{ bgcolor: "#fff7ed", color: "#9a3412", borderLeft: "3px solid", p: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>หมายเหตุงานพิเศษ</Typography>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{workRemark}</Typography>
      </Box>}
      {!readOnly && <Button size="small" startIcon={<EditOutlinedIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => {
        setDraft(current); setDraftArtworks(artworkSlots(artworks)); setError(null);
        requestId.current = crypto.randomUUID(); setEditing(true);
      }}>แก้ไขรายละเอียดงาน</Button>}
    </Stack>
    <Dialog open={editing} onClose={() => !saving && !uploading && setEditing(false)} fullWidth maxWidth="md" aria-labelledby={`work-details-${orderId}-${index}`}>
      <DialogTitle id={`work-details-${orderId}-${index}`}>แก้ไขรายละเอียดงาน</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <WorkDetailsEditor value={draft} onChange={details => { setDraft(details); requestId.current = crypto.randomUUID(); }} disabled={saving}
          onArtworkBusyChange={setUploading} artworks={draftArtworks} onArtworksChange={next => { setDraftArtworks(next); requestId.current = crypto.randomUUID(); }} />
      </DialogContent>
      <DialogActions>
        <Button disabled={saving || uploading} onClick={() => setEditing(false)}>ยกเลิก</Button>
        <Button variant="contained" disabled={saving || uploading} onClick={save}>{saving ? "กำลังบันทึก…" : "บันทึก"}</Button>
      </DialogActions>
    </Dialog>
  </>;
}
