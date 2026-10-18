# Product

<!-- impeccable:product-schema 1 -->

Facts marked *(inferred)* come from the code or README, not from the owner. Confirm or correct them when they matter.

## Platform
web, used mostly on tablets. Phones and desktop browsers must still work *(inferred)*.

## Users
- **Owner** (admin account). Creates and manages production orders, staff accounts and colour settings, and watches where every order is. The person the app most needs to make work easier.
- **Staff** (normal accounts). Floor workers assigned to one or more departments. They see only their department queues, log work done and pass SKUs to the next stage.
- Customers never use the app *(inferred: there is no customer login or customer field)*.

## Product Purpose
Vatana Back Office replaces paper production sheets and Excel for a garment factory. An order is a production spec, not a sales invoice: styles, design names, shirt type, colour variants with per-size quantities, artwork panels and work instructions. Each SKU moves through the floor stages:

ทำตัวอย่าง → รออนุมัติ → จัดผ้า → พิมพ์ → แผนกตกแต่ง → เย็บ → งานพิเศษอื่น ๆ → ตกแต่งขั้นสุดท้าย → พับ → บรรจุ → ส่งแล้ว

The goal is a smoother, easier workflow for the owner than paper and Excel: create an order once, see where every SKU is, and get the production sheet out without retyping.

## Positioning
An internal tool built for this factory's own workflow and vocabulary. It succeeds when it is faster and less error-prone than the paper and Excel it replaces. It does not compete with general ERP software.

## Operating Context
- Tablets most of the time, on the production floor and in the office. Touch input, so targets need to be finger-sized and number entry should bring up a number pad.
- Floor work is repetitive: staff record quantities by colour and size many times a day, often in short sessions between tasks *(inferred)*.
- Morning, afternoon and OT shifts are recorded separately in the Decor department.
- Several people may edit the same order at once. History is append-only and every stage move, note, photo and decor entry is audited.

## Capabilities and Constraints
- Thai is the interface language. Codes, design names and some instructions arrive in English (for example `MLS1035`, `BLUE PRINT`), so mixed Thai and English text must render well.
- Adult sizes XS–XL (XXL optional). Children's shirts use paired headings S/4, M/6, L/8, XL/10, XXL/12; the numbers are size aliases, not ages.
- Quantities can exceed the ordered amount in work logs; the ordered amounts never change from work logging.
- Mistakes are corrected by adding a new entry that references the old one, never by editing or deleting history.
- Product photos are stored privately and shown only to signed-in users.
- Stack: Next.js 16, React 19, Material UI v9, MongoDB, S3. Runs locally under pm2 behind a Cloudflare tunnel.

## Brand Commitments
- **The PDF production sheet format is fixed.** It matches the format the factory uses today (A4 landscape, photos, size and colour grid, artwork, instructions, totals). Do not redesign it without the owner asking. It may be improved later.
- No logo, brand colours or typeface have been specified. Open decision.

## Evidence on Hand
- Reference order: MICKEY SINGAPORE RACER sheet (10 products, 5,000 pieces), loaded by `npm run seed`.
- 63 `[MOCK]` orders for local testing, loaded by `npm run seed:mock -- --dev`, including a 12-product order, a 100-colour-row order and long Thai/English instructions.
- Earlier code-based UX review: `design-review/ux-review.md` in the project files.

## Product Principles
1. **Easier than paper for the owner.** Every common job (create an order, check progress, print the sheet) takes fewer steps than the paper and Excel way.
2. **Staff see only their work.** A staff member lands on their own department queue with the next action obvious.
3. **Never lose or silently change data.** Ask before throwing away typed work, never drop incomplete rows silently, and keep history append-only.
4. **Touch first.** Designed for tablets held on the floor, then checked on desktop and phone.

## Accessibility & Inclusion
- Thai-capable font required; text must stay readable on tablets in factory lighting *(inferred)*.
- Contrast at least 4.5:1 for body text, touch targets at least 44px.
- Staff comfort with technology and any age-related needs are not yet known. Open question.
