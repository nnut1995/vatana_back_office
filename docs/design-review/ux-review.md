# Vatana Back Office: UX/UI review

Goal: make the app easier to use for admins and for floor staff in each department.
Reviewed from the code in `vatana_back_office/src` (not from a running app), so layout notes are inferred from the components.

## Top 5 to fix first

| # | Problem | Who it hurts | Fix |
|---|---|---|---|
| 1 | The sidebar is always open at 232px, even on phones (`AppShell.tsx`, `variant="permanent"`). On a phone it covers most of the screen. | Floor staff on phones/tablets | Use a `temporary` drawer with a menu button below the `md` breakpoint; keep `permanent` on desktop. |
| 2 | Recording work is one dialog doing two jobs: "บันทึกการผลิต / เปลี่ยนขั้นตอน" (`ProductStatusControl.tsx`). The stage picker defaults to the *current* stage, quantities are hidden behind a checkbox, and there are two similar notes fields. | Every department, many times a day | Split into two clear buttons: **"ส่งต่อแผนกถัดไป"** (next stage preselected, quantities shown by default) and **"บันทึกจำนวน"** (stay in this stage). Merge or clearly separate the two notes fields. |
| 3 | The new-order form can lose work. Clicking outside the dialog closes it and throws away everything typed (`NewOrderDialog.tsx`). Products with no SKU/design name and colours with no name are **silently dropped** on save. | Admins creating orders | Ask before closing when the form has data. Show inline errors on the incomplete product instead of dropping it. Put the error message next to the field, not only at the top of a long scrolled dialog. |
| 4 | Order status changes save instantly from a dropdown, including "ยกเลิก", with no confirm and no success message (`OrderStatusControl.tsx`). There is no Snackbar anywhere in the app. | Admins | Confirm before cancelling an order. Add a small success toast ("บันทึกแล้ว") after any save, with Undo for status changes. |
| 5 | The login page pre-fills `admin@vatana.local` and prints the default password under the form (`login/page.tsx`). | Everyone (security + confusion) | Remove the hint and the prefill. Show it only in development if needed. |

## Navigation

- Departments appear twice: "งานรายแผนก" plus a "แผนก" group with 11 sub-items that is open by default. The menu is long and staff see both. Keep one: the overview page, with the sub-list collapsed by default (or shown only for the staff member's own departments).
- "ตั้งค่าสี" and the Decor department both use the palette icon. Give settings a different icon (e.g. `Settings`) and group "ตั้งค่าสี" + "จัดการพนักงาน" under a "ตั้งค่า" heading.
- Staff with one department should land straight on that department's queue after login, not on a page they must click through.

## Dashboard (`(dashboard)/page.tsx`)

- It shows counts only. Make it answer "what needs attention today?": orders due in the next 7 days, overdue orders, and pieces waiting in each department.
- Make each stat card clickable, linking to the orders list already filtered by that status.
- The status bars all share one colour. Use the status colours from `OrderStatusBadge` (which exists but is never used) so the bars and the table match.

## Orders list

- Add a **delivery date (กำหนดส่ง)** column and sort by it; highlight overdue rows. This is the most useful date for production.
- Rows are clickable only by mouse (`onClick` on `TableRow`). Make the order title a real link so keyboard users and "open in new tab" work.
- Filters need the "แสดงผล" button. Apply status, sort and page size as soon as they change; keep search on Enter.
- Show the status as a coloured chip in the table, and change it on the order page. An inline dropdown in every row makes accidental changes easy.

## Order detail page

- The page stacks: header, PDF button, status history, stage summary, then products. Move the PDF button into the header next to the status, and move the two history accordions below the products. People open an order to see products.
- Show delivery date in the header stats row with the other numbers, and in red when overdue.
- Each product card has 3 columns with fixed widths (172px + 300px). On laptop screens the size grid in the middle gets squeezed. Let the right column wrap under the grid below `lg`.
- Long help paragraphs (stage summary footnote, history alert) are hard to scan. Shorten them to one line and move details into an info tooltip.

## Department queue (`DepartmentQueue.tsx`)

- Sort by delivery date (most urgent first) and show the delivery date on each item. Today it sorts by order date only.
- Each item renders the full production sheet card. Offer a compact list view (SKU, design, colours, qty, due date, one action button) and expand on tap.
- The "อัปเดตงานล่าสุด" button suggests data can be stale. Consider auto-refresh after saving and every few minutes.

## Forms and inputs

- Quantity fields use `type="number"` but no `inputMode="numeric"`. Add it so phones show a number pad.
- Most action buttons are `size="small"`. On touch screens, use normal size for the main action of each card (min 44px tall).
- Deleting a product or colour in forms has no confirm. Add Undo or a confirm when the row has data.

## Visual design

- Fonts: Geist has no Thai glyphs, so Thai text falls back to Leelawadee/Tahoma/Thonburi and looks different on each device. Load a Thai font through `next/font` (e.g. **IBM Plex Sans Thai**, **Noto Sans Thai** or **Sarabun**) and use it as the main font.
- Hierarchy: many pages use the same h4 title + grey paragraph + outlined buttons. Give each page one clear primary action (contained button) and make the rest text buttons.
- Use colour for meaning consistently: one colour per order status and per stage, reused in chips, bars and tables.

## Clean-up

- `components/Sidebar.tsx` is unused and uses Tailwind classes the app doesn't load. Delete it.
- `components/OrderStatusBadge.tsx` is unused. Use it (see above) or delete it.

## Suggested order of work

1. Quick wins (small, low risk): login hint, mobile drawer, confirm on cancel + success toast, `inputMode`, Thai font, remove dead files.
2. Data-safety fixes in the new-order dialog.
3. Split the production record dialog into "ส่งต่อ" and "บันทึกจำนวน".
4. Dashboard "needs attention" view, delivery-date column and urgency sorting.
5. Order page layout and compact department queue.
