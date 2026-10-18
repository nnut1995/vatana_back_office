import { currentUser } from "@/lib/access";
import { canWorkProduct } from "@/lib/permissions";
import { getDb } from "@/lib/mongodb";
import { type Order } from "@/types/order";
import { NextResponse } from "next/server";
import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";
import { requireAuth } from "@/lib/api-auth";
import { getS3Client, S3_BUCKET, isProductImageKey } from "@/lib/s3";

/**
 * Serve a product photo out of S3.
 *
 * Images are streamed through the app rather than linked directly so the
 * bucket can stay private — only signed-in back-office users can see them,
 * and no public-access policy is needed on `vatana-backoffice`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { key: segments } = await params;
  const key = segments.join("/");

  if (!isProductImageKey(key)) {
    return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
  }

  const user = (await currentUser())!;
  if (user.role !== "admin") {
    const orders = await (await getDb()).collection<Order>("orders").find({ status: { $ne: "cancelled" }, $or: [
      { "products.imageKey": key },
      { "products.artworks.imageKey": key },
    ] }, { projection: { products: 1 } }).toArray();
    const allowed = orders.some(order => order.products.some(product => canWorkProduct(user, product) &&
      (product.imageKey === key || product.artworks?.some(artwork => artwork.imageKey === key))));
    if (!allowed) return NextResponse.json({ error: "ไม่มีสิทธิ์ดูรูปนี้" }, { status: 403 });
  }
  try {
    const object = await getS3Client().send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    if (!object.Body) {
      return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    }

    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "image/webp",
        // Keys are immutable (a new photo gets a new uuid), so cache hard.
        "Cache-Control": "private, no-store",
        ...(object.ContentLength
          ? { "Content-Length": String(object.ContentLength) }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    }
    console.error(`GET /api/images/${key} failed:`, error);
    return NextResponse.json({ error: "โหลดรูปภาพไม่สำเร็จ" }, { status: 500 });
  }
}
