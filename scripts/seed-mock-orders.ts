/** Append-only, idempotent development fixtures. Never rewrites existing orders. */
import { MongoClient, ObjectId } from "mongodb";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { getS3Client, S3_BUCKET } from "../src/lib/s3";
import { orderTotal, type OrderProduct, type Order } from "../src/types/order";

const batch = "vatana-reference-20261001";
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !process.argv.includes("--dev") || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(uri).hostname))
    throw new Error("Use --dev with the verified local development MongoDB only");
  const health = await fetch("http://localhost:3003/api/health");
  if (!health.ok) throw new Error("Existing dev server on :3003 must be running");
  const client = await new MongoClient(uri).connect();
  const db = client.db(process.env.MONGODB_DB || "vatana");
  const orders = db.collection<Order & { mockBatch: string }>("orders");
  const assets = db.collection<{ _id: string; keys: string[] }>("mock_fixture_assets");
  try {
    if (process.argv.includes("--cleanup")) {
      const saved = await assets.findOne({ _id: batch });
      const result = await orders.deleteMany({ mockBatch: batch });
      for (const key of saved?.keys ?? []) await getS3Client().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      await assets.deleteOne({ _id: batch });
      console.log(`Removed ${result.deletedCount} mock orders from ${db.databaseName}; original orders untouched`);
      return;
    }
    const before = await orders.find({ mockBatch: { $ne: batch } }).toArray();
    const originalHash = createHash("sha256").update(JSON.stringify(before)).digest("hex");
    let keys = (await assets.findOne({ _id: batch }))?.keys;
    if (!keys) {
      keys = [];
      for (let i = 0; i < 7; i++) {
        const key = `products/mock-${batch}-${randomUUID()}.webp`;
        await getS3Client().send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: await readFile(`scripts/fixtures/vatana-reference/${i}.webp`), ContentType: "image/webp" }));
        keys.push(key);
      }
      await assets.insertOne({ _id: batch, keys });
    }
    const sizes = (a: number[]) => ({ XS: a[0], S: a[1], M: a[2], L: a[3], XL: a[4] });
    const captions = ["Print On", "Tag on Size Label", "Stick on T-shirt"];
    const basic = (i: number): OrderProduct => ({ styleCode: `MMF${1023+i}`, designName: ["FA CAI MAHJONG", "SHI SAN YAO", "NEON MAHJONG", "BAI FA BAI ZHONG"][i%4], productType: "ผู้ใหญ่-ผ้าตัว", status: "sample", imageKey: keys![i%4], workFront: i<2 ? "ทรานสเฟอร์" : i===2 ? "ปกติ+Glow" : "ปกติ+Glitterทอง", workBack: i<2 ? "ทรานสเฟอร์" : i===2 ? "ปกติ+Glow" : "", variants: i===2 ? [{ color: "ดำ BLACK", sizes: sizes([120,160,190,190,140]) }] : [{ color: i===3 ? "กรม NAVY":"ดำ BLACK", sizes: sizes([60,85,85,85,85]) }, { color: i===3 ? "ครีม 034-L":"แดง RED", sizes: sizes([80,120,150,150,100]) }], artworks: captions.slice(0,i===2?3:2).map((caption,j)=>({caption,imageKey:keys![4+j]})) });
    const longText = ("ตรวจสอบสีและไซซ์ก่อนส่งผลิต ตรวจแนวตะเข็บและตำแหน่งลาย / Check print alignment and fabric before sewing.\n").repeat(45).slice(0,4900);
    const fixtures = [
      { reference: "MOCK-CNY-REFERENCE-20261001", title: "[MOCK] MR MERLION CNY — ตามใบอ้างอิง", products: [0,1,2,3].map(basic), notes: "Mock matching reference: 3,800 pieces. กำหนดส่งตามใบ 2 กุมภาพันธ์ 2569" },
      { reference: "MOCK-CNY-LARGE-20261001", title: "[MOCK] LARGE — 12 สินค้า × 30 สี / 360 colour rows", products: Array.from({length:12},(_,i)=>({...basic(i%4),styleCode:`MOCK-LARGE-${String(i+1).padStart(2,"0")}`,designName:`ลายทดสอบผลิตจำนวนมาก ${i+1} — LARGE PRODUCTION`,workSleeves:"ทรานสเฟอร์แขนซ้ายและขวา",productionSteps:"1. ตรวจผ้า 2. พิมพ์หน้าและหลัง 3. เย็บ 4. ตรวจคุณภาพ 5. บรรจุ",workRemark:"ตรวจจำนวนทุกสีและทุกไซซ์ก่อนบรรจุ",artworks:captions.map((caption,j)=>({caption,imageKey:keys![4+j]})),variants:Array.from({length:30},(_,v)=>({color:`สี ${v+1} / COLOUR ${String(v+1).padStart(2,"0")}`,sizes:sizes([20+v,30+v,40+v,50+v,60+v])}))})), notes: "360 colour rows × 5 sizes; all quantities must survive pagination and PDF export." },
      { reference: "MOCK-CNY-LONG-20261001", title: "[MOCK] LONG — 100 สี + ข้อความไทย/อังกฤษยาว", products: [{...basic(0),styleCode:"MOCK-LONG-END-100",designName:"ลายพิเศษสำหรับทดสอบชื่อยาวภาษาไทยและภาษาอังกฤษ CUSTOM ARTWORK LONG STYLE DESCRIPTION ".repeat(3),workFront:longText,workBack:longText,productionSteps:longText,workRemark:longText,artworks:captions.map((caption,j)=>({caption,imageKey:keys![4+j]})),variants:Array.from({length:100},(_,v)=>({color:`สีพิเศษ ${v+1} / SPECIAL COLOUR ${String(v+1).padStart(3,"0")}`,sizes:sizes([v+1,v+2,v+3,v+4,v+5])}))}],notes:longText },
      ...Array.from({length:60},(_,i)=>({reference:`MOCK-CNY-LIST-${String(i+1).padStart(3,"0")}-20261001`,title:`[MOCK] LIST ${String(i+1).padStart(3,"0")} — ทดสอบค้นหาและแบ่งหน้า`,products:[{...basic(i%4),styleCode:`MOCK-LIST-SKU-${i+1}`}],notes:"List pagination fixture; safe to remove using seed:mock -- --dev --cleanup"})),
    ];
    const now = new Date();
    for (const [i,f] of fixtures.entries()) {
      await orders.updateOne({mockBatch:batch,reference:f.reference},{$setOnInsert:{...f,_id:new ObjectId(),mockBatch:batch,status:(["new","in_production","completed"] as const)[i<3?0:i%3],orderDate:new Date("2026-01-16"),deliveryDate:"2026-02-02",createdAt:new Date(now.getTime()+i),updatedAt:now}},{upsert:true});
    }
    const after = await orders.find({mockBatch:{$ne:batch}}).toArray();
    if (createHash("sha256").update(JSON.stringify(after)).digest("hex") !== originalHash) throw new Error("Original order verification failed");
    const saved = await orders.find({mockBatch:batch}).toArray();
    console.log(JSON.stringify({database:db.databaseName,mockBatch:batch,originalOrdersUnchanged:before.length,mockOrders:saved.length,representatives:saved.filter(o=>!o.reference.includes("-LIST-")).map(o=>({id:String(o._id),title:o.title,reference:o.reference,products:o.products.length,colourRows:o.products.reduce((n,p)=>n+p.variants.length,0),total:orderTotal(o)}))},null,2));
  } finally { await client.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
