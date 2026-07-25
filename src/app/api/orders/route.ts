import { NextResponse } from "next/server";
import { listOrders, createOrder } from "@/lib/orders";
import { requireAuth } from "@/lib/api-auth";
import { ORDER_STATUSES, type OrderStatus, type CreateOrderInput } from "@/types/order";

export async function GET(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && ORDER_STATUSES.includes(statusParam as OrderStatus)
      ? (statusParam as OrderStatus)
      : undefined;

  try {
    const orders = await listOrders(status);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  let body: CreateOrderInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Order title is required" }, { status: 400 });
  }
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json(
      { error: "At least one product is required" },
      { status: 400 },
    );
  }
  for (const p of body.products) {
    if (!p.styleCode?.trim() || !p.designName?.trim()) {
      return NextResponse.json(
        { error: "Each product needs a style code and design name" },
        { status: 400 },
      );
    }
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      return NextResponse.json(
        { error: `Product ${p.styleCode} needs at least one colour variant` },
        { status: 400 },
      );
    }
  }

  try {
    const order = await createOrder(body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
