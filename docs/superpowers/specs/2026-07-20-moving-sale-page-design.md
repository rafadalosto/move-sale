# Rafael's Moving Sale — Design Spec

**Date:** 2026-07-20
**Status:** Approved, ready for implementation planning

## Purpose

A single-page static website listing household items Rafael is selling
because he's moving out of his house in Almere, Netherlands. Visitors browse
items and bundled "deals," see price/specs/description, optionally follow a
link for more detail, and contact Rafael via WhatsApp to buy.

## Scope

- One HTML page. No routing, no backend, no database.
- Content (items, deals, contact number) is edited by hand in JSON/config
  files — no admin UI, no CMS.
- Hosted on GitHub Pages as a static site — no build step, no Node/npm
  dependency required to run or deploy.
- Out of scope: payments, inventory/stock tracking, item request/reservation
  flow, multi-language support, "sold" status UI (sold items are simply
  deleted from the JSON).

## Architecture

Plain HTML/CSS/vanilla JS, no framework, no bundler.

```
/
├── index.html
├── styles.css
├── app.js
├── items.json
├── deals.json
└── images/
    ├── sofa.jpg
    ├── tv.jpg
    └── ...
```

`app.js` fetches `items.json` and `deals.json` on page load, renders cards
into the grid, and wires up the `All` / `Deals` filter. Adding, editing, or
removing a listing is done by hand-editing the JSON and dropping an image
into `/images` — no rebuild step, just commit and push.

Rationale for no build tooling: the site is small (roughly 5-15 listings),
short-lived (a personal sale, not an ongoing product), and GitHub Pages
serves static files directly — a build step would add tooling overhead
without a matching benefit. `fetch()` of local JSON requires the page be
served over http(s) rather than opened via `file://`, so local development
uses a simple static server (e.g. `python -m http.server`); GitHub Pages
satisfies this automatically in production.

## Data Model

### `items.json`

One entry per individual item for sale.

```json
{
  "id": "jaxx-sofa",
  "title": "JAXX Choice Sofa",
  "price": 800.00,
  "badge": "8 Mos Old",
  "specs": ["2,5 seats capacity", "Waterproof fabric"],
  "description": "Beautiful condition...",
  "image": "images/sofa.jpg",
  "specsLink": "https://example.com/jaxx-sofa",
  "dealName": "Living Room Combo",
  "dealLink": "https://example.com/or-#anchor"
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique slug, used as DOM id. |
| `title` | yes | Item skipped from render if missing. |
| `price` | yes | Number, EUR. Item skipped from render if missing. |
| `image` | yes | Path under `images/`. Item skipped from render if missing. |
| `badge` | no | Free-text, e.g. "8 Mos Old", "New". No badge shown if absent. |
| `specs` | no | Array of short strings, rendered as bullet list. |
| `description` | no | Short paragraph. |
| `specsLink` | no | If present, renders a "View Specs ↗" button opening in a new tab. |
| `dealName` | no | If present (with `dealLink`), item is treated as part of a deal. |
| `dealLink` | no | Full URL the "part of a deal" tag links to. An item belongs to at most one deal. |

### `deals.json`

One entry per bundle, rendered as its own card (not built dynamically from
`items.json` — deals are fixed, hand-authored bundles).

```json
{
  "id": "livingroom-combo",
  "name": "Living Room Combo",
  "price": 1000.00,
  "originalPrice": 1150.00,
  "freeDelivery": true,
  "items": ["JAXX Choice Sofa", "IKEA Mirror"],
  "image": "images/livingroom-combo.jpg",
  "link": "https://example.com/or-#anchor",
  "description": "Buy the sofa and mirror together and save..."
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Unique slug. |
| `name` | yes | Deal skipped from render if missing. |
| `price` | yes | Bundle price. Deal skipped from render if missing. |
| `image` | yes | Deal card's own representative image. Deal skipped from render if missing. |
| `originalPrice` | no | If present, shown struck-through next to `price` to imply savings. |
| `freeDelivery` | no | Boolean. Shows a "🚚 Free delivery" badge if true. |
| `items` | no | Array of display names (plain text, not a live join against `items.json`). |
| `link` | no | Deal's own outbound link (also the target for items' `dealLink`). |
| `description` | no | Short paragraph. |

## Layout & Components

**Sticky header:** `Rafael's Moving Sale` (styled title, not a system font)
· `📍 Almere` · a single `💬 WhatsApp` button linking to
`https://wa.me/31620659657`, styled as the primary call-to-action. No phone
"Call" button.

**Filter bar:** `All | Deals` tabs directly under the header, pure
client-side show/hide (no reload, no URL change).

**Grid ordering:**
- Under `All`: deal cards render first, followed by individual items in
  `items.json` order.
- Under `Deals`: only deal cards render.

**Item card:** optional badge (top-left corner), 4:3 image, bold price,
bold title, bullet-point specs, description, optional small
"🔗 Part of: {dealName}" tag linking to `dealLink` when the item belongs to
a deal, optional "View Specs ↗" button when `specsLink` is set.

**Deal card:** visually distinguished via a bold color-block treatment
(De Stijl accent, see below) so it reads as a bundle rather than another
product — image, `originalPrice` struck through next to bold `price`,
"🚚 Free delivery" badge when applicable, list of bundled item names,
description, outbound `link`.

**Responsive grid:** CSS grid, 3 columns desktop → 2 columns tablet → 1
column mobile. No JS involved in the reflow.

## Visual Direction

Dutch De Stijl (Mondrian/Rietveld-inspired), chosen deliberately over a
generic "AI slop" aesthetic (per `CLAUDE.md`'s frontend aesthetics
guidance) and tied to the sale's Almere/Netherlands location:

- Bold primary-color blocks (red / blue / yellow) on a white background,
  applied via CSS variables for consistency.
- Thick black rule lines used as structural dividers (header underline,
  card borders, grid separators).
- A geometric or slab display font for the title and badges — not
  Inter/Arial/system fonts.
- Sharp square corners throughout; no gradients, no soft rounded corners.
- Deal cards get a stronger color-block treatment than item cards to stand
  out as the "best offer."

**Motion:** one staggered reveal on page load — cards fade/slide in with
incremental `animation-delay`. Subtle hover lift/shadow on cards. Switching
the `All`/`Deals` filter does a quick fade-out/fade-in of the grid rather
than an abrupt reflow. CSS-only, no animation library.

## Interactions

- External links (`specsLink`, deal `link`, item `dealLink`) open in a new
  tab with `rel="noopener"`.
- WhatsApp button links directly to `https://wa.me/31620659657`.
- Filter tabs toggle an active state and show/hide matching cards.

## Error Handling

Kept intentionally minimal — this is a small personal site, not a product:

- If an item/deal image fails to load, show a plain placeholder block
  instead of a broken-image icon.
- If `items.json` or `deals.json` fail to fetch, show a small inline
  message ("Couldn't load items — try refreshing") instead of a blank page.
- An item or deal missing a required field (see tables above) is skipped
  from rendering rather than crashing the page.

## Verification

No automated test suite — not warranted for a static single-page site.
Manual verification before considering the work done:

1. Serve locally over http(s) (e.g. `python -m http.server`) since
   `fetch()` of local JSON does not work over `file://`.
2. Click through: filter toggle (`All`/`Deals`), WhatsApp button, an item's
   deal tag, an item's "View Specs" link, an item with a deliberately
   missing image (confirm placeholder shows).
3. Resize the browser through the 3/2/1-column breakpoints.
4. Push to GitHub Pages and re-verify the same checks against the live URL.
