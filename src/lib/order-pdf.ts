import { chromium } from "playwright-core";
import { existsSync } from "node:fs";
import { orderSheetHtml } from "./order-sheet-html";
import type { SerializedOrder } from "../types/order";

/** Use the installed browser on this Mac, or a configured Chromium on a server. */
export function pdfBrowserPath() {
  const candidates = [process.env.PDF_CHROMIUM_EXECUTABLE_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];
  const path = candidates.find(p => p && existsSync(p));
  if (!path) throw new Error("PDF browser unavailable: set PDF_CHROMIUM_EXECUTABLE_PATH");
  return path;
}

export async function renderOrderPdf(order: SerializedOrder, images: Map<string, string>) {
  const browser = await chromium.launch({ executablePath: pdfBrowserPath(), headless: true });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    // Never let saved text or remote image URLs cause server-side network requests.
    await context.route("**/*", route => route.abort());
    const page = await context.newPage();
    await page.setContent(orderSheetHtml(order, key => key ? images.get(key) || "" : ""), { waitUntil: "load" });
    await page.evaluate(async () => { await document.fonts.ready; });
    return await page.pdf({ format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true });
  } finally { await browser.close(); }
}
