/**
 * Seed the database with an admin user and the sample production order
 * (MICKEY SINGAPORE RACER - ADULTS), matching the reference sheet.
 * Run with:  npm run seed
 */
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI is not set. Add it to .env.local, then run: npm run seed");
  process.exit(1);
}

const dbName = process.env.MONGODB_DB || "vatana";

const ADMIN_EMAIL = "admin@vatana.local";
const ADMIN_PASSWORD = "admin123";

// Each finishing step is a description plus an optional reference photo
// (`imageKey`), uploaded later from the production sheet.
const FINISHINGS = ["Print On", "Tag on Size Label", "Stick on T-shirt", "Stick on T-shirt"].map(
  (description) => ({ description }),
);

// [XS, S, M, L, XL] -> size object
const sizes = ([xs, s, m, l, xl]: number[]) => ({ XS: xs, S: s, M: m, L: l, XL: xl });

const product = (
  styleCode: string,
  designName: string,
  variants: { color: string; qty: number[] }[],
  material?: string,
) => ({
  styleCode,
  designName,
  productType: "ADULTS UNISEX T-SHIRT",
  material,
  status: "sample",
  finishings: FINISHINGS,
  variants: variants.map((v) => ({ color: v.color, sizes: sizes(v.qty) })),
});

const sampleOrder = {
  title: "MICKEY SINGAPORE RACER - ADULTS",
  reference: "MLS-RACER-ADULTS",
  orderDate: new Date("2026-07-07"),
  status: "new",
  notes: undefined as string | undefined,
  products: [
    product("MLS1035", "BLUE PRINT", [{ color: "NAVY", qty: [50, 110, 130, 130, 80] }], "TPU"),
    product("MLS1036", "GLOW ICONS", [{ color: "BLACK", qty: [50, 110, 130, 130, 80] }]),
    product("MLS1037", "MERLION SILHOUETTE", [{ color: "RED", qty: [50, 110, 130, 130, 80] }]),
    product("MLS1038", "CHECKERED I", [{ color: "BLACK", qty: [50, 110, 130, 130, 80] }]),
    product("MLS1039", "RACING LOGO", [{ color: "BLACK", qty: [50, 110, 130, 130, 80] }]),
    product("MLS1040", "CHASE", [{ color: "NAVY", qty: [50, 110, 130, 130, 80] }]),
    product("MLS1041", "COMIC STRIP", [{ color: "BLACK", qty: [60, 90, 110, 100, 40] }]),
    product("MLS1042", "SPONSORSHIP", [
      { color: "WHITE", qty: [30, 90, 110, 110, 60] },
      { color: "BLACK", qty: [30, 90, 110, 110, 60] },
    ]),
    product("MLS1043", "CHECKERED II", [{ color: "BLACK", qty: [60, 90, 110, 100, 40] }]),
    product("MLS1044", "RACER", [{ color: "BLACK", qty: [60, 90, 110, 100, 40] }]),
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(dbName);

  // Admin user (idempotent).
  const users = db.collection("users");
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await users.updateOne(
    { email: ADMIN_EMAIL },
    {
      $setOnInsert: {
        email: ADMIN_EMAIL,
        name: "Admin",
        passwordHash,
        role: "admin",
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
  console.log(`Admin user ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);

  // Sample order (idempotent by reference).
  const orders = db.collection("orders");
  const existing = await orders.findOne({ reference: sampleOrder.reference });
  if (existing) {
    console.log(`Order "${sampleOrder.reference}" already exists — skipping.`);
  } else {
    await orders.insertOne(sampleOrder);
    const pieces = sampleOrder.products.reduce(
      (sum, p) =>
        sum +
        p.variants.reduce(
          (s, v) => s + v.sizes.XS + v.sizes.S + v.sizes.M + v.sizes.L + v.sizes.XL,
          0,
        ),
      0,
    );
    console.log(
      `Inserted order "${sampleOrder.title}" (${sampleOrder.products.length} products, ${pieces} pieces).`,
    );
  }

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
