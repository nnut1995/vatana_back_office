import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { requireAdmin } from "@/lib/api-auth";
import { getOrder } from "@/lib/orders";
import { renderOrderPdf } from "@/lib/order-pdf";
import { getS3Client, S3_BUCKET, isProductImageKey } from "@/lib/s3";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await params;
  try {
    const order = await getOrder(id);
    if (!order) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
    const images = new Map<string, string>();
    const keys = [...new Set(order.products.flatMap(p => [p.imageKey, ...(p.artworks ?? []).map(a => a.imageKey)]))];
    for (const key of keys) {
      if (!key || !isProductImageKey(key)) continue;
      const object = await getS3Client().send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
      if (!object.Body) throw new Error("Missing production image");
      const bytes = await object.Body.transformToByteArray();
      images.set(key, `data:image/webp;base64,${Buffer.from(bytes).toString("base64")}`);
    }
    const pdf = await renderOrderPdf(order, images);
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="order-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    console.error("Order PDF export failed", error);
    return NextResponse.json({ error: "สร้าง PDF ไม่สำเร็จ กรุณาตรวจสอบรูปประกอบและการตั้งค่าเบราว์เซอร์ PDF" }, { status: 500 });
  }
}
