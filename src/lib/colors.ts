import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { parseColorInput, type ConfiguredColor } from "./color-config";
import type { ColorVariant } from "@/types/order";

export interface ColorDocument { _id: ObjectId; name: string; nameKey: string; hex: string; createdAt: Date; updatedAt: Date }
export async function listColors(): Promise<ConfiguredColor[]> {
  const documents = await (await getDb()).collection<ColorDocument>("colors").find({}).sort({ name: 1 }).toArray();
  return documents.map(c => ({ id: c._id.toString(), name: c.name, hex: c.hex }));
}
export async function saveColor(collection: Collection<ColorDocument>, value: unknown, id?: string) {
  const input = parseColorInput(value);
  if (id && !ObjectId.isValid(id)) throw new Error("ไม่พบสี");
  await collection.createIndex({ nameKey: 1 }, { unique: true });
  const now = new Date();
  if (id) {
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { ...input, updatedAt: now } });
    if (!result.matchedCount) throw new Error("ไม่พบสี");
    return id;
  }
  const result = await collection.insertOne({ ...input, createdAt: now, updatedAt: now } as ColorDocument);
  return result.insertedId.toString();
}
/** Trust catalog values, never a client-supplied name or hex. Retain old unassigned colors when editing existing SKUs. */
export function assignConfiguredColors(variants: ColorVariant[], colors: ConfiguredColor[], existing: ColorVariant[] = []): ColorVariant[] {
  const assigned: ColorVariant[] = variants.map(v => {
    const color = v.colorId ? colors.find(c => c.id === v.colorId) : colors.find(c => c.name.toLowerCase() === v.color.toLowerCase());
    if (color) return { ...v, color: color.name, colorId: color.id, colorHex: color.hex };
    if (!v.colorId && existing.some(old => !old.colorId && old.color === v.color)) return { color: v.color, sizes: v.sizes };
    throw new Error("กรุณาเลือกสีจากการตั้งค่าสี หรือเพิ่มสีในหน้าตั้งค่าสีก่อน");
  });
  const keys = assigned.map(v => v.colorId || v.color.toLowerCase());
  if (new Set(keys).size !== keys.length) throw new Error("ชื่อสีซ้ำ กรุณารวมจำนวนในแถวเดียวกัน");
  return assigned;
}
