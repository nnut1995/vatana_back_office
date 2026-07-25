/** Thousands-separated integer, e.g. 12500 -> "12,500". */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** ISO date as YYYY-MM-DD, matching the production sheet header. */
export function formatDateISO(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Readable date + time (for created/updated timestamps). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
