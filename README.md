# Vatana Back Office

A Next.js (App Router) back-office and order-management app with **Material UI**, backed by **MongoDB** and deployable to **Vercel**.

## Stack

- **Next.js 16** (App Router, Server Components, Turbopack)
- **React 19** + **Material UI (MUI) v9** with Emotion
- **MongoDB** via the official `mongodb` driver (cached connection for serverless)
- **Auth.js (NextAuth v5)** — credentials login, route protection via `proxy.ts`
- **AWS S3** + **sharp** — product photo upload and optimisation
- **TypeScript**

## Getting started (local)

You already have MongoDB running locally on `localhost:27017`.

### 1. Configure environment

```bash
cp .env.example .env.local
```

`.env.local` is preconfigured for local Mongo. Set a real `AUTH_SECRET`:

```bash
# macOS/Linux
openssl rand -base64 32
```

```dotenv
MONGODB_URI="mongodb://localhost:27017"
MONGODB_DB="vatana"
AUTH_SECRET="<paste generated value>"

# Product photos — IAM user with s3:PutObject/GetObject/DeleteObject on the bucket
S3_ACCESS_KEY="<access key id>"
S3_SECRET_ACCESS_KEY="<secret access key>"
S3_REGION="ap-southeast-1"
S3_BUCKET="vatana-backoffice"
```

The bucket does **not** need public access — see [Product photos](#product-photos).

### 2. Install, seed, run

```bash
npm install
npm run seed   # creates the admin user + sample orders
npm run dev
```

Open the app and sign in:

- **URL:** http://localhost:3000
- **Email:** `admin@vatana.local`
- **Password:** `admin123`

> If port 3000 is taken, Next picks the next free port — check the terminal output.

### 3. Run persistently with pm2 (port 3002)

`npm run dev` is fine while you're working, but to keep the app up locally
(surviving terminal closes and reboots) it runs under **pm2** as
`vatana-back-office` on **http://localhost:3002**, defined in
`ecosystem.config.cjs`.

```bash
npm run pm2:start     # build, then start (or reload if already running)
npm run pm2:restart   # rebuild and restart — use after any code change
npm run pm2:logs      # tail stdout/stderr
npm run pm2:stop      # stop, keep in the pm2 list
npm run pm2:delete    # remove from pm2 entirely
```

Notes:

- This runs the **production** server (`next start`), so it serves the last
  build. Code changes are not picked up until you `npm run pm2:restart`.
- Secrets are **not** in `ecosystem.config.cjs` — `next start` reads
  `.env.local` itself, so that file must exist next to `package.json`.
- Logs are written to `.pm2/out.log` and `.pm2/error.log` (gitignored).
- To bring it back automatically after a reboot:
  `pm2 save && pm2 startup` (then run the command pm2 prints).

## Order format

Orders are **garment production orders** (modelled on the MICKEY SINGAPORE RACER sheet), not sales invoices:

- **Order header** — title, reference, order date, status.
- **Products** — each has a style code (`MLS1035`), design name (`BLUE PRINT`), product type (`ADULTS UNISEX T-SHIRT`), optional material (`TPU`), and finishing instructions.
- **Colour variants** — each product has one or more colours (e.g. SPONSORSHIP = WHITE + BLACK), each with a per-size quantity breakdown across `XS / S / M / L / XL` and an auto-computed row total.
- **Totals** — piece totals roll up per variant → per product → per order.

There is no pricing or customer field — it's a production spec. The seed inserts the full 10-product / 5,000-piece MICKEY SINGAPORE RACER order.

## Features

- **Authentication** — email/password login; every page is gated by `src/proxy.ts`, and the order API routes are guarded server-side. Sign out from the top-right avatar menu.
- **Dashboard** — order counts, total pieces, and a status breakdown.
- **Orders list** — MUI table (title, order date, product count, total pieces) with inline status editing; click a row to open the order.
- **Order detail** — a production sheet that mirrors the reference PDF: each product with its image slot, size grid, colour rows, totals and finishing notes.
- **New order dialog** — build an order with repeatable products and colour variants, with live per-variant and grand totals.
- **Product photos** — click-or-drop a photo on any product, in the new-order dialog or straight onto a saved order's production sheet. See below.

## Product photos

Each product carries one photo. Uploads go through the app, never straight to
S3 from the browser, which keeps the AWS credentials server-side.

**Optimisation.** `POST /api/uploads` hands the file to `sharp`
(`src/lib/images.ts`) before it ever reaches the bucket:

| Step            | Behaviour                                              |
| --------------- | ------------------------------------------------------ |
| Orientation     | EXIF rotation applied, then metadata stripped          |
| Resize          | long edge capped at **1200 px**, aspect kept, no upscale |
| Transparency    | flattened onto white (so PNGs aren't black on print)   |
| Format          | **WebP**, quality 80                                   |
| Rejected        | non-images, and anything over **15 MB** raw            |

A 4032×3024 phone photo lands around 1200×900 at a few tens of KB; the worst
case measured (full-frame noise) was 386 KB from a 7.3 MB original.

**Storage.** Objects go to `s3://vatana-backoffice/products/<uuid>.webp`
(`ap-southeast-1`). The key — not a URL — is what's persisted on the product, so
the bucket is free to stay **private**: `GET /api/images/products/<uuid>.webp`
streams the object to signed-in users only. No public-access policy or bucket
policy change is needed. Replacing or removing a photo deletes the old object.

If you'd rather serve images straight from S3 (public bucket or CloudFront),
the one place to change is `productImageSrc()` in `src/types/order.ts`.

The legacy `imageUrl` field still works for externally hosted images; `imageKey`
takes precedence when both are set.

## Project structure

```
src/
  proxy.ts                 # Route protection (Next 16 "proxy", formerly middleware)
  auth.ts / auth.config.ts # NextAuth config (split: full vs edge-safe)
  theme.tsx                # MUI theme + Next Link integration
  app/
    layout.tsx             # MUI ThemeProvider + CssBaseline
    login/page.tsx         # Sign-in page
    (dashboard)/           # Authenticated shell (AppBar + Drawer)
      page.tsx             # Dashboard
      orders/page.tsx      # Orders list
      orders/[id]/page.tsx # Order detail (production sheet)
    api/
      auth/[...nextauth]/  # NextAuth handlers
      health/route.ts      # GET — liveness + DB ping
      uploads/route.ts     # POST — optimise a photo and store it in S3
      images/[...key]/     # GET — stream a photo back out of S3
      orders/route.ts      # GET (list) / POST (create) — auth-guarded
      orders/[id]/route.ts # GET / PATCH (status) — auth-guarded
      orders/[id]/products/[index]/image/  # PATCH — set/clear a product photo
  components/              # AppShell, OrdersTable, OrderProductionSheet,
                           # NewOrderDialog, OrderStatusControl, OrderStatusBadge,
                           # ProductImageUpload, ProductImageControl
  lib/                    # mongodb, orders, users, api-auth, format, s3, images
  types/                  # order (products/variants/sizes), user, next-auth
scripts/seed.ts           # Admin user + MICKEY SINGAPORE RACER sample order
ecosystem.config.cjs      # pm2 process definition (local, port 3002)
```

## API

| Method | Route             | Auth | Description                        |
| ------ | ----------------- | ---- | ---------------------------------- |
| GET    | `/api/health`     | no   | Liveness + DB connectivity         |
| GET    | `/api/orders`     | yes  | List orders (`?status=` to filter) |
| POST   | `/api/orders`     | yes  | Create an order                    |
| GET    | `/api/orders/:id` | yes  | Fetch one order                    |
| PATCH  | `/api/orders/:id` | yes  | Update order status                |
| POST   | `/api/uploads`    | yes  | Upload + optimise a product photo  |
| GET    | `/api/images/*`   | yes  | Stream a stored photo from S3      |
| PATCH  | `/api/orders/:id/products/:index/image` | yes | Set/clear a product's photo |

Create an order:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "title": "MICKEY SINGAPORE RACER - ADULTS",
    "orderDate": "2026-07-07",
    "products": [{
      "styleCode": "MLS1035",
      "designName": "BLUE PRINT",
      "material": "TPU",
      "variants": [
        { "color": "NAVY", "sizes": { "XS": 50, "S": 110, "M": 130, "L": 130, "XL": 80 } }
      ]
    }]
  }'
```

Attach a photo to product `0` of an existing order (two steps — upload, then link):

```bash
# 1. Upload: returns { "key": "products/<uuid>.webp", width, height, bytes, ... }
curl -X POST http://localhost:3002/api/uploads \
  -b cookies.txt \
  -F "file=@shirt.jpg"

# 2. Link the returned key to the product
curl -X PATCH http://localhost:3002/api/orders/<orderId>/products/0/image \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{ "imageKey": "products/<uuid>.webp" }'

# Clear it again with:  -d '{ "imageKey": null }'
```

Both routes require a session cookie — they return `401` otherwise.

## Deploy to Vercel

1. Push this repo to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Provision a production database (local Mongo won't be reachable from Vercel) — e.g. **MongoDB Atlas**, and allow Vercel network access (`0.0.0.0/0`).
3. Set environment variables in **Project Settings → Environment Variables**:
   - `MONGODB_URI` (Atlas SRV string)
   - `MONGODB_DB`
   - `AUTH_SECRET`
   - `S3_ACCESS_KEY`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `S3_BUCKET`
4. Deploy, then run the seed against the production DB once (or create your admin user another way).

> Photo uploads run on the Node.js runtime (`sharp` is a native module) and are
> well inside Vercel's 100 MB request-body limit — the app caps raw uploads at
> 15 MB anyway.
