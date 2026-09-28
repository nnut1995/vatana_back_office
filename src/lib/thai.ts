/** Translate only known legacy defaults for display; keep stored order data intact. */
const LEGACY_DEFAULTS: Record<string, string> = {
  "ADULTS UNISEX T-SHIRT": "เสื้อยืดผู้ใหญ่ ยูนิเซ็กซ์",
  "Print On": "พิมพ์ลาย",
  "Tag on Size Label": "ติดป้ายที่ป้ายขนาด",
  "Stick on T-shirt": "ติดสติกเกอร์บนเสื้อ",
};

export function thaiDefault(text: string): string {
  return Object.hasOwn(LEGACY_DEFAULTS, text) ? LEGACY_DEFAULTS[text] : text;
}
