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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const object = await getS3Client().send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    );
    if (!object.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType ?? "image/webp",
        // Keys are immutable (a new photo gets a new uuid), so cache hard.
        "Cache-Control": "private, max-age=31536000, immutable",
        ...(object.ContentLength
          ? { "Content-Length": String(object.ContentLength) }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error(`GET /api/images/${key} failed:`, error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
