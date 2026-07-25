"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stack, Typography } from "@mui/material";
import { ProductImageUpload } from "@/components/ProductImageUpload";

/**
 * Photo slot on the production sheet: uploads a new image and persists it
 * against this product of a saved order.
 */
export function ProductImageControl({
  orderId,
  index,
  imageKey,
  imageUrl,
  alt,
}: {
  orderId: string;
  index: number;
  imageKey?: string;
  imageUrl?: string;
  alt: string;
}) {
  const router = useRouter();
  const [key, setKey] = useState<string | null>(imageKey ?? null);
  const [error, setError] = useState<string | null>(null);

  async function save(newKey: string | null) {
    const previous = key;
    setError(null);
    setKey(newKey);

    try {
      const res = await fetch(`/api/orders/${orderId}/products/${index}/image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey: newKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setKey(previous);
        setError(data.error ?? "Could not save the photo.");
        return;
      }
      router.refresh();
    } catch {
      setKey(previous);
      setError("Could not save the photo.");
    }
  }

  return (
    <Stack spacing={0.5} sx={{ alignItems: "center" }}>
      <ProductImageUpload
        imageKey={key}
        fallbackSrc={imageUrl}
        onChange={save}
        alt={alt}
        size={104}
      />
      {error && (
        <Typography variant="caption" color="error" align="center">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
