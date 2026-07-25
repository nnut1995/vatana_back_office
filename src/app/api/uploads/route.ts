import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth } from "@/lib/api-auth";
import { getS3Client, S3_BUCKET, PRODUCT_IMAGE_PREFIX } from "@/lib/s3";
import {
  optimizeProductImage,
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/images";

/**
 * Upload one product photo.
 *
 * Accepts multipart/form-data with a single `file` field, optimizes it to a
 * small WebP and stores it in S3. Returns the object key — callers persist
 * that on the product and render it via `productImageSrc()`.
 */
export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Image is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB` },
      { status: 413 },
    );
  }
  if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported image type: ${file.type}` },
      { status: 415 },
    );
  }

  let optimized;
  try {
    optimized = await optimizeProductImage(
      Buffer.from(await file.arrayBuffer()),
    );
  } catch {
    // sharp throws on anything it cannot decode — i.e. not really an image.
    return NextResponse.json(
      { error: "That file could not be read as an image" },
      { status: 400 },
    );
  }

  const key = `${PRODUCT_IMAGE_PREFIX}${randomUUID()}.webp`;

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: optimized.buffer,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
  } catch (error) {
    console.error("POST /api/uploads failed to store object:", error);
    return NextResponse.json({ error: "Failed to store image" }, { status: 500 });
  }

  return NextResponse.json(
    {
      key,
      width: optimized.width,
      height: optimized.height,
      bytes: optimized.bytes,
      originalBytes: file.size,
    },
    { status: 201 },
  );
}
