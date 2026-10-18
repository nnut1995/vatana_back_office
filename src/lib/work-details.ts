import { parseArtworks } from "./artworks";
import type { WorkDetails, ProductionArtwork } from "@/types/order";

export const WORK_DETAIL_FIELDS = ["workFront", "workBack", "workSleeves", "productionSteps", "workRemark"] as const;
export const emptyWorkDetails = (): WorkDetails => ({ workFront: "", workBack: "", workSleeves: "", productionSteps: "", workRemark: "" });

/** Validate user input before persisting; omitted optional details start empty. */
export function parseWorkDetails(value: unknown): WorkDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const details = emptyWorkDetails();
  for (const key of WORK_DETAIL_FIELDS) {
    const text = input[key];
    if (text !== undefined && (typeof text !== "string" || text.length > 5000)) return null;
    details[key] = typeof text === "string" ? text.trim() : "";
  }
  return details;
}

/** Omitted artwork leaves existing uploads intact for old clients. */
export function parseWorkSpecification(value: unknown): (WorkDetails & { artworks?: ProductionArtwork[] }) | null {
  const details = parseWorkDetails(value);
  if (!details) return null;
  const input = value as Record<string, unknown>;
  if (!Object.hasOwn(input, "artworks")) return details;
  const artworks = parseArtworks(input.artworks);
  return artworks ? { ...details, artworks } : null;
}
