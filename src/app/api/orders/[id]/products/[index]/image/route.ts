import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { updateProductImage } from "@/lib/orders";
import { deleteProductImage, isProductImageKey } from "@/lib/s3";

/**
 * Set or clear the photo of one product inside an existing order.
 *
 * Body: `{ "imageKey": "products/<uuid>.webp" }` to set, or
 *       `{ "imageKey": null }` to remove the photo.
 *
 * The key must first be obtained from `POST /api/uploads`.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id, index } = await params;

  let body: { imageKey?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageKey = body.imageKey ?? null;
  if (imageKey !== null && !isProductImageKey(imageKey)) {
    return NextResponse.json(
      { error: "imageKey must be an uploaded product image key, or null" },
      { status: 400 },
    );
  }

  const result = await updateProductImage(id, Number(index), imageKey);
  if (!result.ok) {
    return NextResponse.json({ error: "Order or product not found" }, { status: 404 });
  }

  // The replaced photo is now unreferenced — clean it out of the bucket.
  if (result.previousKey && result.previousKey !== imageKey) {
    await deleteProductImage(result.previousKey);
  }

  return NextResponse.json({ success: true, imageKey });
}
