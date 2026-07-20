# Multi-Photo Carousel — Design Spec

**Date:** 2026-07-20
**Status:** Approved, ready for implementation planning

## Purpose

Item and deal cards currently show exactly one photo (`image` string field).
Most real listings have multiple useful photos (different angles, close-ups
of damage, product-box shots). This feature lets each item/deal show
multiple photos in a swipeable/clickable carousel, and populates the real
extra photos already available from the source PDF.

## Scope

- Data model: `image` (string) → `images` (array of strings, 1+ required)
  on both `items.json` and `deals.json`. This is a breaking schema change;
  all 16 existing items are migrated in the same change.
- Carousel UI: horizontal photo strip per card with arrow buttons, dot
  indicators, and native touch-swipe. Cards with only one photo render
  exactly as before — no arrows, no dots.
- Content: add the real additional photos already extracted from the PDF
  for items that have more than one usable shot (12 of 16 items).
- Out of scope: photo captions, lightbox/zoom-to-fullscreen, reordering
  photos via UI (order is just the array order in the JSON), autoplay.

## Data Model

### `items.json` / `deals.json`

The `image` field is replaced by `images`:

```json
{
  "id": "jaxx-sofa",
  "title": "JAXX Choice Sofa",
  "price": 800,
  "images": ["images/sofa-1.jpg", "images/sofa-2.jpg"],
  ...
}
```

| Field | Required | Notes |
|---|---|---|
| `images` | yes | Array of one or more image paths. Item/deal is skipped from render if missing, not an array, or empty (same "skip invalid" behavior the site already has for missing `image`). |

`isValidItem`/`isValidDeal` change their image check from
"`image` is a non-empty string" to "`images` is an array with at least one
non-empty string entry."

## Markup (`render.js`)

Each card's image area becomes:

```html
<div class="card__carousel">
  <div class="card__carousel-track">
    <img class="card__carousel-slide" src="..." alt="..." loading="lazy" onerror="...">
    <img class="card__carousel-slide" src="..." alt="..." loading="lazy" onerror="...">
  </div>
  <!-- only when images.length > 1: -->
  <button class="card__carousel-arrow card__carousel-arrow--prev" aria-label="Previous photo">‹</button>
  <button class="card__carousel-arrow card__carousel-arrow--next" aria-label="Next photo">›</button>
  <div class="card__carousel-dots">
    <button class="card__carousel-dot card__carousel-dot--active" aria-label="Photo 1" aria-current="true"></button>
    <button class="card__carousel-dot" aria-label="Photo 2"></button>
  </div>
</div>
```

- `card__carousel-track` is the horizontally-scrolling strip
  (`overflow-x: auto; scroll-snap-type: x mandatory`); each
  `card__carousel-slide` is `scroll-snap-align: start`.
- Arrows and dots are omitted entirely from the markup when `images.length
  === 1` — not just hidden via CSS, so a single-photo card has zero extra
  DOM and zero visual change from today.
- Each slide keeps its own `onerror` → `images/placeholder.svg` fallback
  (unchanged mechanism from today, just applied per-slide instead of
  per-card).
- Alt text: `"{title} — photo {n} of {total}"` when there are multiple
  photos, plain `{title}` when there's only one (unchanged from today).

## Interaction (`app.js`)

- After each render, wire up every `.card__carousel` that has arrows:
  - Arrow click: `track.scrollBy({ left: track.clientWidth * direction,
    behavior: 'smooth' })`.
  - Dot click: `track.scrollTo({ left: dotIndex * track.clientWidth,
    behavior: 'smooth' })`.
  - A debounced `scroll` listener on the track (same 200ms-class debounce
    pattern already used for the filter fade) recomputes the nearest slide
    index from `track.scrollLeft / track.clientWidth` and updates which dot
    has `card__carousel-dot--active` / `aria-current`.
- Touch swipe requires no JS — it's native scrolling on the track, with
  `scroll-snap` doing the snapping.
- Re-wiring happens each time `render()` replaces the grid's `innerHTML`
  (same as how filter re-render already works today) — no persistent
  per-card state needs to survive a re-render.

## Visual Style

Arrows and dots follow the existing De Stijl language: square corners, black
borders, no gradients/shadows beyond what the card already uses. Arrows are
small square buttons overlaid on the image (semi-opaque black background,
white glyph) positioned left/right-center. Dots are small square (not
round, to stay on-theme) buttons in a row, active dot filled with the
existing yellow accent color.

## Photo Migration Plan

12 of the 16 items gain additional real photos extracted from the source
PDF (14 new image files total): sofa, bicycles, dining table + chairs, TV,
wardrobe, mirror cabinet, 8-drawer chest, day-bed, EKET cabinets, mesh
basket, wall lamps, and blinds. Four items keep a single photo because only
one usable shot existed in the PDF: TV bench, plain mirror, Malm chest of
4 drawers, and the TP-Link router.

One photo is deliberately excluded: a second router photo shows the
physical label with the WiFi password, MAC address, and IMEI clearly
legible, and is not used for privacy/security reasons. A couple of
interior drawer/closet shots that showed mostly personal belongings rather
than the furniture itself were also skipped in favor of cleaner
alternatives, where one existed.

## Error Handling

- Same per-image broken-photo fallback as today, now applied per-slide:
  a single broken photo in a multi-photo carousel falls back to
  `placeholder.svg` for that slide only; the rest of the carousel is
  unaffected.
- An item/deal with a missing, non-array, or empty `images` field is
  skipped from rendering (same "skip invalid" behavior as today's missing
  `image` case) — no crash.
- No dependency on `scrollend` (inconsistent browser support); active-dot
  tracking uses a debounced `scroll` listener instead, so it degrades
  gracefully everywhere `scroll-snap` itself is supported (all evergreen
  browsers).

## Verification

- Node tests (`node --test render.test.js`) for the new pure-logic pieces:
  markup differs correctly between single-photo (no arrows/dots) and
  multi-photo (arrows/dots present, correct count) cards, and for the
  updated `isValidItem`/`isValidDeal` array check.
- Manual verification via a local static server plus a headless-browser
  pass (as already used to verify the PDF content import): click arrows,
  click dots, confirm the active dot updates, confirm swiping the track
  moves between photos, confirm a deliberately-broken image path falls
  back to the placeholder without breaking sibling slides, screenshot the
  result.
