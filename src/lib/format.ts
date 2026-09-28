/** Thousands-separated integer, e.g. 12500 -> "12,500". */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("th-TH").format(n);
}

/** Display an order date in Thai with a Buddhist-era year. */
export function formatDateISO(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}

/** Readable date + time (for created/updated timestamps). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(iso));
}
