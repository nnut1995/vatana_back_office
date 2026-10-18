import { MongoClient } from "mongodb";
import { parseColorInput } from "../src/lib/color-config";
import type { ColorDocument } from "../src/lib/colors";

// Approximate display swatches; supplier fabric codes are retained in the names.
// Multi-color and textured fabrics use representative single-color swatches.
const fabricColors: [string, string][] = [
  ["ดำ", "#111111"],
  ["กรม", "#1E293B"],
  ["เทา", "#9CA3AF"],
  ["แดง", "#DC2626"],
  ["ชมพู 032-L", "#F4B6CC"],
  ["ฟ้า 001-L", "#A9D7F0"],
  ["ม่วง 018-L", "#C9B6E4"],
  ["ขาว", "#FFFFFF"],
  ["เทอร์ควอยซ์ 010-L", "#56C5D0"],
  ["เหลืองไข่ไก่", "#F8D568"],
  ["ตัดต่อ", "#94A3B8"],
  ["ไล่สี", "#A78BFA"],
  ["มิ้น 035-L", "#AFE1CE"],
  ["มีหลายสี", "#A3A3A3"],
  ["น้ำเงิน 082-D", "#174A8B"],
  ["พีชชมพู 030-L", "#F5B5AB"],
  ["ครีม 034-L", "#FFF0D4"],
  ["เหลือง", "#FACC15"],
  ["ชมพูปกติ", "#F48FB1"],
  ["ดำตีเกลียว", "#343434"],
  ["แดงตีเกลียว", "#B54343"],
  ["น้ำเงิน", "#2563EB"],
  ["ม่วง", "#8B5CF6"],
  ["ดำสลาฟ", "#3F3F46"],
  ["ชมพู 008-L", "#E85C9E"],
  ["เขียว", "#16A34A"],
  ["ฟ้าเทอร์ควอยซ์ 010-L", "#56C5D0"],
  ["เขียวสะท้อน 050-M", "#A3E635"],
  ["น้ำเงินสลาฟ", "#466B9E"],
  ["มัดย้อม", "#A78BFA"],
  ["ส้ม", "#F97316"],
  ["ชมพูบานเย็น008-L", "#E85C9E"],
  ["ส้มแซลม่อน", "#FA9B85"],
  ["ฟ้าเก่า", "#7CAAC3"],
  ["เทาลายทางขาว", "#B8BDC5"],
  ["บานเย็นGB'", "#D63384"],
];

async function main() {
  const inputs = fabricColors.map(([name, hex]) => parseColorInput({ name, hex }));
  if (new Set(inputs.map(color => color.nameKey)).size !== inputs.length) throw new Error("Duplicate color in seed data");
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ count: inputs.length, colors: inputs.map(({ name, hex }) => ({ name, hex })) }, null, 2));
    return;
  }
  if (!process.env.MONGODB_URI) throw new Error("Missing MONGODB_URI");
  const client = await new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).connect();
  try {
    const collection = client.db(process.env.MONGODB_DB || "vatana").collection<ColorDocument>("colors");
    await collection.createIndex({ nameKey: 1 }, { unique: true });
    const now = new Date();
    // Safe to rerun: retain existing IDs, names and admin-adjusted HEX codes.
    const result = await collection.bulkWrite(inputs.map(color => ({ updateOne: {
      filter: { nameKey: color.nameKey },
      update: { $setOnInsert: { ...color, createdAt: now, updatedAt: now } },
      upsert: true,
    } })));
    const saved = await collection.find({ nameKey: { $in: inputs.map(color => color.nameKey) } }).toArray();
    if (saved.length !== inputs.length) throw new Error("Seed verification failed");
    for (const color of saved) parseColorInput(color);
    console.log(JSON.stringify({ requested: inputs.length, added: result.upsertedCount, existingPreserved: result.matchedCount, verified: saved.length, totalColors: await collection.countDocuments() }, null, 2));
  } finally { await client.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
