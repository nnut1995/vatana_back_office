import { listColors, assignConfiguredColors } from "@/lib/colors";
import { ALL_SIZES } from "@/lib/order-sizes";
import { parseVariants } from "@/lib/product-variants";
import { validSheetInput } from "@/lib/production-sheet-input";
import { productTypeValue, parseProductType } from "@/lib/product-type";
import { parseWorkDetails } from "@/lib/work-details";
import { NextResponse } from "next/server";
import { listOrders, createOrder } from "@/lib/orders";
import { requireAdmin } from "@/lib/api-auth";
import { 
  ORDER_STATUSES,
  PRODUCT_STATUSES,
  type OrderStatus,
  type ProductStatus,
  type CreateOrderInput,
} from "@/types/order";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && (ORDER_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as OrderStatus)
      : undefined;

  try {
    const orders = await listOrders(status);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return NextResponse.json({ error: "โหลดคำสั่งซื้อไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: CreateOrderInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  if (!validSheetInput(body)) {
    return NextResponse.json({ error: "วันที่กำหนดส่ง ประเภทผ้า หรือรูปประกอบไม่ถูกต้อง" }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "กรุณาระบุชื่อคำสั่งซื้อ" }, { status: 400 });
  }
  if (!Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json(
      { error: "กรุณาเพิ่มสินค้าอย่างน้อยหนึ่งรายการ" },
      { status: 400 },
    );
  }
  const colors = await listColors();
  for (const p of body.products) {
    if (!p || !parseProductType(productTypeValue(p))) {
      return NextResponse.json({ error: "กรุณาระบุประเภทเสื้อให้สินค้าทุกรายการ (ไม่เกิน 120 ตัวอักษร)" }, { status: 400 });
    }
    if (!parseWorkDetails(p)) {
      return NextResponse.json({ error: "รายละเอียดงานต้องเป็นข้อความไม่เกิน 5,000 ตัวอักษรต่อช่อง" }, { status: 400 });
    }
    if (typeof p.styleCode !== "string" || !p.styleCode.trim() || typeof p.designName !== "string" || !p.designName.trim()) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสสินค้าและชื่อลายของสินค้าทุกรายการ" },
        { status: 400 },
      );
    }
    if (p.status && !PRODUCT_STATUSES.includes(p.status as ProductStatus)) {
      return NextResponse.json(
        { error: "กรุณาเลือกสถานะที่รองรับ" },
        { status: 400 },
      );
    }
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      return NextResponse.json(
        { error: `สินค้า ${p.styleCode} ต้องมีอย่างน้อยหนึ่งสี` },
        { status: 400 },
      );
    }
    try {
      p.variants = assignConfiguredColors(parseVariants(p.variants.map(v => ({ ...v, sizes: Object.fromEntries(ALL_SIZES.map(s => [s, v?.sizes?.[s] ?? 0])) }))), colors);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "สีหรือจำนวนไม่ถูกต้อง" }, { status: 400 });
    }
  }

  try {
    const order = await createOrder(body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return NextResponse.json({ error: "สร้างคำสั่งซื้อไม่สำเร็จ" }, { status: 500 });
  }
}
