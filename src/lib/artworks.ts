import type { ProductionArtwork } from "../types/order";

export const ARTWORK_CAPTIONS = ["Print On", "Tag on Size Label", "Stick on T-shirt"] as const;
export function artworkSlots(artworks: ProductionArtwork[] = []): ProductionArtwork[] {
  return ARTWORK_CAPTIONS.map((caption, index) => ({ ...(artworks[index] ?? { caption }) }));
}

export function parseArtworks(value: unknown): ProductionArtwork[] | null {
  if (!Array.isArray(value) || value.length > 3) return null;
  const result: ProductionArtwork[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || typeof entry.caption !== "string" || entry.caption.length > 120) return null;
    if (entry.imageKey != null && (typeof entry.imageKey !== "string" || !/^products\/[A-Za-z0-9_-]+\.webp$/.test(entry.imageKey))) return null;
    if (entry.imageUrl != null) {
      if (typeof entry.imageUrl !== "string" || entry.imageUrl.length > 2048) return null;
      try { if (new URL(entry.imageUrl).protocol !== "https:") return null; } catch { return null; }
    }
    result.push({ caption: entry.caption.trim(), ...(entry.imageKey ? { imageKey: entry.imageKey } : {}), ...(entry.imageUrl ? { imageUrl: entry.imageUrl } : {}) });
  }
  return result;
}
