import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { updateProductFinishings } from "@/lib/orders";
import { deleteProductImage, isProductImageKey } from "@/lib/s3";
import type { Finishing } from "@/types/order";

/**
 * Replace the finishing list of one product inside an existing order.
 *
 * Body: `{ "finishings": [{ "description": "Print On", "imageKey": "products/<uuid>.webp" }] }`
 *
 * Each `imageKey` must first be obtained from `POST /api/uploads`; an empty
 * array clears the product's finishings.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { id, index } = await params;

  let body: { finishings?: Finishing[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.finishings)) {
    return NextResponse.json({ error: "finishings must be an array" }, { status: 400 });
  }
  for (const finishing of body.finishings) {
    if (typeof finishing?.description !== "string") {
      return NextResponse.json(
        { error: "Each finishing needs a description" },
        { status: 400 },
      );
    }
    if (finishing.imageKey && !isProductImageKey(finishing.imageKey)) {
      return NextResponse.json(
        { error: "imageKey must be an uploaded product image key" },
        { status: 400 },
      );
    }
  }

  const result = await updateProductFinishings(id, Number(index), body.finishings);
  if (!result.ok) {
    return NextResponse.json({ error: "Order or product not found" }, { status: 404 });
  }

  // Photos dropped from the list are now unreferenced — clean them out.
  await Promise.all(result.orphanedKeys.map(deleteProductImage));

  return NextResponse.json({ success: true });
}
