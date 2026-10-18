"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";

/** Reloads the current page's server data, e.g. after a failed load. */
export function RefreshButton({ label = "ลองอีกครั้ง" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button color="inherit" size="small" disabled={pending} onClick={() => startTransition(() => router.refresh())} sx={{ fontWeight: 700 }}>
      {pending ? "กำลังโหลด…" : label}
    </Button>
  );
}
