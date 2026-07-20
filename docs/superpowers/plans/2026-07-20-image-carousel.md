# Multi-Photo Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each item/deal card show multiple photos in a swipeable carousel (arrows, dots, native touch-swipe), and populate the real extra photos already available from the source PDF for 12 of the 16 items.

**Architecture:** `image` (string) becomes `images` (array) in the JSON schema. `render.js` gains a shared `renderCarouselHTML(images, altBase)` pure-HTML-string helper used by both `renderItemCardHTML` and `renderDealCardHTML`; it emits a `scroll-snap` horizontal strip, and — only when there are 2+ photos — arrow and dot `<button>`s. `styles.css` styles the strip/arrows/dots. `app.js` wires arrow/dot clicks and a debounced `scroll` listener to keep the active dot in sync, re-running after every `render()` the same way the existing filter re-render already works.

**Tech Stack:** Same as the rest of the site — plain HTML/CSS/vanilla JS, no build step, no framework. Node's built-in `node:test`/`node:assert` for `render.js` unit tests. The final task's end-to-end check uses Playwright, installed only in a throwaway temp directory outside the repo — never committed, no `package.json` added to the project.

## Global Constraints

- No build tooling and no npm dependency required to run or deploy the site — GitHub Pages must serve the repo root as-is. Playwright (used only for final manual verification) is installed in a temp directory outside the repo, never added to the project.
- `images` (array of strings, 1+ required) replaces `image` (string) on every entry in `items.json` and `deals.json`. An item/deal is skipped from render if `images` is missing, not an array, or empty — same "skip invalid" behavior the site already has.
- A card with exactly one photo renders with zero extra DOM — no arrow buttons, no dots — visually identical to before this feature.
- A card with 2+ photos gets arrow buttons, dot indicators, and native touch-swipe via CSS `scroll-snap` — no hand-rolled touch-event JS.
- Active-dot tracking uses a debounced `scroll` listener (not the `scrollend` event, for broader browser support), matching the existing 200ms-class debounce pattern already used for the filter fade in `app.js`.
- Visual style matches the existing Dutch De Stijl language already in `styles.css`: square corners, black borders (`var(--border-thin)`/`var(--border-thick)`), no gradients or rounded corners; the active dot uses the existing `var(--color-yellow)` accent.
- Alt text is `"{title} — photo {n} of {total}"` for multi-photo cards, plain `{title}` for single-photo cards.
- One candidate photo (a second TP-Link router photo) shows the device's WiFi password, MAC address, and IMEI clearly legible on its label — it must NOT be used, for privacy/security reasons. The router keeps its single existing photo only.

---

### Task 1: Carousel data model and markup in `render.js`

**Files:**
- Modify: `render.js` (rewrite in full)
- Modify: `render.test.js` (rewrite in full)

**Interfaces:**
- Consumes: nothing new — this task only changes `render.js` itself.
- Produces (updated): `isValidItem(item): boolean` and `isValidDeal(deal): boolean` now require `item.images`/`deal.images` to be a non-empty array of non-empty strings, instead of `item.image`/`deal.image` being a non-empty string.
- Produces (new, internal, not exported — same pattern as the existing `escapeHTML` helper): `hasValidImages(images): boolean`, `renderCarouselHTML(images: array, altBase: string): string`.
- Produces (updated): `renderItemCardHTML(item): string` and `renderDealCardHTML(deal): string` now read `item.images`/`deal.images` (not `.image`) and delegate the photo area to `renderCarouselHTML`.
- `buildCardList(items, deals, filter): string` signature and behavior are unchanged.
- New CSS class contract that Task 3's `styles.css` must style, and Task 4's `app.js` must query: `card__carousel` (wrapper), `card__carousel-track` (scrollable strip), `card__carousel-slide` (one per photo), and — present only when a card has 2+ photos — `card__carousel-arrow--prev`, `card__carousel-arrow--next`, `card__carousel-dots` (wrapper), `card__carousel-dot` (one button per photo, first one also gets `card__carousel-dot--active` and `aria-current="true"`).

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `render.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatPrice,
  isValidItem,
  isValidDeal,
  renderItemCardHTML,
  renderDealCardHTML,
  buildCardList,
} = require("./render.js");

test("formatPrice formats whole euros with two decimals", () => {
  assert.equal(formatPrice(800), "EUR 800,00");
});

test("formatPrice formats cents correctly", () => {
  assert.equal(formatPrice(349.5), "EUR 349,50");
});

test("formatPrice formats a small price", () => {
  assert.equal(formatPrice(15), "EUR 15,00");
});

test("isValidItem accepts an item with title, price, and images", () => {
  assert.equal(
    isValidItem({ title: "Sofa", price: 800, images: ["images/sofa.jpg"] }),
    true
  );
});

test("isValidItem rejects an item missing price", () => {
  assert.equal(
    isValidItem({ title: "Sofa", images: ["images/sofa.jpg"] }),
    false
  );
});

test("isValidItem rejects an item with an empty title", () => {
  assert.equal(
    isValidItem({ title: "  ", price: 10, images: ["images/x.jpg"] }),
    false
  );
});

test("isValidItem rejects an item with an empty images array", () => {
  assert.equal(
    isValidItem({ title: "Sofa", price: 800, images: [] }),
    false
  );
});

test("isValidItem rejects an item where images is not an array", () => {
  assert.equal(
    isValidItem({ title: "Sofa", price: 800, images: "images/sofa.jpg" }),
    false
  );
});

test("isValidDeal accepts a deal with name, price, and images", () => {
  assert.equal(
    isValidDeal({ name: "Combo", price: 1000, images: ["images/combo.jpg"] }),
    true
  );
});

test("isValidDeal rejects a deal missing images", () => {
  assert.equal(isValidDeal({ name: "Combo", price: 1000 }), false);
});

test("renderItemCardHTML includes price, title, and badge", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "JAXX Choice Sofa",
    price: 800,
    badge: "8 Mos Old",
    images: ["images/sofa.jpg"],
  });
  assert.match(html, /EUR 800,00/);
  assert.match(html, /JAXX Choice Sofa/);
  assert.match(html, /8 Mos Old/);
  assert.match(html, /class="card card--item"/);
});

test("renderItemCardHTML escapes HTML-sensitive characters in title", () => {
  const html = renderItemCardHTML({
    id: "x",
    title: 'Rafael\'s "Best" Sofa <sale>',
    price: 10,
    images: ["images/x.jpg"],
  });
  assert.equal(html.includes("<sale>"), false);
  assert.match(html, /Rafael&#39;s &quot;Best&quot; Sofa &lt;sale&gt;/);
});

test("renderItemCardHTML adds a deal tag when dealName/dealLink are set", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "Sofa",
    price: 800,
    images: ["images/sofa.jpg"],
    dealName: "Living Room Combo",
    dealLink: "https://wa.me/31620659657",
  });
  assert.match(html, /card__deal-tag/);
  assert.match(html, /Living Room Combo/);
});

test("renderItemCardHTML omits the deal tag when dealName/dealLink are absent", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "Sofa",
    price: 800,
    images: ["images/sofa.jpg"],
  });
  assert.equal(html.includes("card__deal-tag"), false);
});

test("renderItemCardHTML renders a single slide with no arrows or dots when there is one image", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "Sofa",
    price: 800,
    images: ["images/sofa.jpg"],
  });
  const slideCount = (html.match(/card__carousel-slide/g) || []).length;
  assert.equal(slideCount, 1);
  assert.equal(html.includes("card__carousel-arrow"), false);
  assert.equal(html.includes("card__carousel-dot"), false);
});

test("renderItemCardHTML renders arrows and dots when there are multiple images", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "Sofa",
    price: 800,
    images: ["images/sofa-1.jpg", "images/sofa-2.jpg", "images/sofa-3.jpg"],
  });
  const slideCount = (html.match(/card__carousel-slide/g) || []).length;
  const dotButtonCount = (html.match(/<button class="card__carousel-dot/g) || []).length;
  assert.equal(slideCount, 3);
  assert.equal(dotButtonCount, 3);
  assert.match(html, /card__carousel-arrow--prev/);
  assert.match(html, /card__carousel-arrow--next/);
  assert.match(html, /card__carousel-dot--active/);
});

test('renderItemCardHTML sets "photo N of M" alt text only when there are multiple images', () => {
  const single = renderItemCardHTML({
    id: "a", title: "Sofa", price: 800, images: ["images/sofa.jpg"],
  });
  assert.match(single, /alt="Sofa"/);

  const multi = renderItemCardHTML({
    id: "b", title: "Sofa", price: 800, images: ["images/a.jpg", "images/b.jpg"],
  });
  assert.match(multi, /alt="Sofa — photo 1 of 2"/);
  assert.match(multi, /alt="Sofa — photo 2 of 2"/);
});

test("renderDealCardHTML includes price, original price, and free delivery badge", () => {
  const html = renderDealCardHTML({
    id: "combo",
    name: "Living Room Combo",
    price: 1000,
    originalPrice: 1150,
    freeDelivery: true,
    images: ["images/combo.jpg"],
  });
  assert.match(html, /EUR 1000,00/);
  assert.match(html, /EUR 1150,00/);
  assert.match(html, /Free delivery/);
  assert.match(html, /class="card card--deal"/);
});

test("renderDealCardHTML renders dots matching the number of images", () => {
  const html = renderDealCardHTML({
    id: "combo",
    name: "Combo",
    price: 1000,
    images: ["images/a.jpg", "images/b.jpg"],
  });
  const dotButtonCount = (html.match(/<button class="card__carousel-dot/g) || []).length;
  assert.equal(dotButtonCount, 2);
});

test("buildCardList puts deals before items under the 'all' filter", () => {
  const items = [{ id: "a", title: "Item A", price: 1, images: ["a.jpg"] }];
  const deals = [{ id: "d", name: "Deal D", price: 2, images: ["d.jpg"] }];
  const html = buildCardList(items, deals, "all");
  assert.ok(html.indexOf("Deal D") < html.indexOf("Item A"));
});

test("buildCardList returns only deal cards under the 'deals' filter", () => {
  const items = [{ id: "a", title: "Item A", price: 1, images: ["a.jpg"] }];
  const deals = [{ id: "d", name: "Deal D", price: 2, images: ["d.jpg"] }];
  const html = buildCardList(items, deals, "deals");
  assert.match(html, /Deal D/);
  assert.equal(html.includes("Item A"), false);
});

test("buildCardList skips invalid items and deals", () => {
  const items = [{ id: "a", title: "Item A", price: 1, images: ["a.jpg"] }, { id: "bad" }];
  const deals = [{ id: "d", name: "Deal D", price: 2, images: ["d.jpg"] }, { id: "bad" }];
  const html = buildCardList(items, deals, "all");
  const cardCount = (html.match(/class="card /g) || []).length;
  assert.equal(cardCount, 2);
});

test("buildCardList returns an empty string for empty inputs", () => {
  assert.equal(buildCardList([], [], "all"), "");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test render.test.js`
Expected: FAIL — several tests fail because the current `render.js` still requires a singular `item.image`/`deal.image` string and has no carousel markup at all: the `isValidItem`/`isValidDeal` "accepts" tests fail (current code rejects fixtures that only set `images`), the new carousel-markup tests fail (no `card__carousel-slide`/`card__carousel-dot` classes exist yet), and the three `buildCardList` content tests fail (every fixture is filtered out as invalid, since current validation never looks at `images`).

- [ ] **Step 3: Write the implementation**

Replace the full contents of `render.js`:

```js
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.MovingSale = factory();
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  function formatPrice(price) {
    const fixed = Number(price).toFixed(2);
    const parts = fixed.split(".");
    return "EUR " + parts[0] + "," + parts[1];
  }

  function hasValidImages(images) {
    return Array.isArray(images) && images.length > 0 &&
      images.every(function (src) { return typeof src === "string" && src.trim() !== ""; });
  }

  function isValidItem(item) {
    return Boolean(
      item &&
      typeof item.title === "string" && item.title.trim() !== "" &&
      typeof item.price === "number" && !Number.isNaN(item.price) &&
      hasValidImages(item.images)
    );
  }

  function isValidDeal(deal) {
    return Boolean(
      deal &&
      typeof deal.name === "string" && deal.name.trim() !== "" &&
      typeof deal.price === "number" && !Number.isNaN(deal.price) &&
      hasValidImages(deal.images)
    );
  }

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderCarouselHTML(images, altBase) {
    const multi = images.length > 1;

    const slides = images.map(function (src, index) {
      const alt = multi
        ? escapeHTML(altBase) + " — photo " + (index + 1) + " of " + images.length
        : escapeHTML(altBase);
      return '<img class="card__carousel-slide" src="' + escapeHTML(src) + '" alt="' + alt +
        '" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'">';
    }).join("");

    const dots = multi
      ? images.map(function (_, index) {
          const activeClass = index === 0 ? " card__carousel-dot--active" : "";
          const ariaCurrent = index === 0 ? ' aria-current="true"' : "";
          return '<button class="card__carousel-dot' + activeClass + '" aria-label="Photo ' +
            (index + 1) + '" type="button"' + ariaCurrent + "></button>";
        }).join("")
      : "";

    const controls = multi
      ? '<button class="card__carousel-arrow card__carousel-arrow--prev" aria-label="Previous photo" type="button">‹</button>' +
        '<button class="card__carousel-arrow card__carousel-arrow--next" aria-label="Next photo" type="button">›</button>' +
        '<div class="card__carousel-dots">' + dots + "</div>"
      : "";

    return (
      '<div class="card__carousel">' +
      '<div class="card__carousel-track">' + slides + "</div>" +
      controls +
      "</div>"
    );
  }

  function renderItemCardHTML(item) {
    const badge = item.badge
      ? '<span class="card__badge">' + escapeHTML(item.badge) + "</span>"
      : "";
    const specs = Array.isArray(item.specs) && item.specs.length
      ? '<ul class="card__specs">' +
        item.specs.map(function (spec) { return "<li>" + escapeHTML(spec) + "</li>"; }).join("") +
        "</ul>"
      : "";
    const description = item.description
      ? '<p class="card__description">' + escapeHTML(item.description) + "</p>"
      : "";
    const dealTag = item.dealName && item.dealLink
      ? '<a class="card__deal-tag" href="' + escapeHTML(item.dealLink) +
        '" target="_blank" rel="noopener">🔗 Part of: ' + escapeHTML(item.dealName) + "</a>"
      : "";
    const specsLink = item.specsLink
      ? '<a class="card__cta" href="' + escapeHTML(item.specsLink) +
        '" target="_blank" rel="noopener">View Specs ↗</a>'
      : "";

    return (
      '<article class="card card--item">' +
      badge +
      renderCarouselHTML(item.images, item.title) +
      '<div class="card__body">' +
      '<p class="card__price">' + formatPrice(item.price) + "</p>" +
      "<h3 class=\"card__title\">" + escapeHTML(item.title) + "</h3>" +
      specs +
      description +
      dealTag +
      specsLink +
      "</div>" +
      "</article>"
    );
  }

  function renderDealCardHTML(deal) {
    const originalPrice = typeof deal.originalPrice === "number"
      ? '<span class="card__price-original">' + formatPrice(deal.originalPrice) + "</span>"
      : "";
    const freeDelivery = deal.freeDelivery
      ? '<span class="card__badge card__badge--delivery">🚚 Free delivery</span>'
      : "";
    const items = Array.isArray(deal.items) && deal.items.length
      ? '<ul class="card__specs">' +
        deal.items.map(function (name) { return "<li>" + escapeHTML(name) + "</li>"; }).join("") +
        "</ul>"
      : "";
    const description = deal.description
      ? '<p class="card__description">' + escapeHTML(deal.description) + "</p>"
      : "";
    const link = deal.link
      ? '<a class="card__cta" href="' + escapeHTML(deal.link) +
        '" target="_blank" rel="noopener">View Deal ↗</a>'
      : "";

    return (
      '<article class="card card--deal">' +
      freeDelivery +
      renderCarouselHTML(deal.images, deal.name) +
      '<div class="card__body">' +
      '<p class="card__price">' + formatPrice(deal.price) + " " + originalPrice + "</p>" +
      "<h3 class=\"card__title\">" + escapeHTML(deal.name) + "</h3>" +
      items +
      description +
      link +
      "</div>" +
      "</article>"
    );
  }

  function buildCardList(items, deals, filter) {
    const validDeals = (Array.isArray(deals) ? deals : []).filter(isValidDeal);
    const validItems = (Array.isArray(items) ? items : []).filter(isValidItem);

    const dealCards = validDeals.map(renderDealCardHTML);
    const itemCards = validItems.map(renderItemCardHTML);

    if (filter === "deals") {
      return dealCards.join("");
    }
    return dealCards.concat(itemCards).join("");
  }

  return {
    formatPrice: formatPrice,
    isValidItem: isValidItem,
    isValidDeal: isValidDeal,
    renderItemCardHTML: renderItemCardHTML,
    renderDealCardHTML: renderDealCardHTML,
    buildCardList: buildCardList,
  };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test render.test.js`
Expected: PASS — 23 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add render.js render.test.js
git commit -m "feat: replace single image field with multi-photo carousel markup"
```

---

### Task 2: Photo migration and content update

**Files:**
- Modify: `items.json` (rewrite in full)
- Create: `images/sofa-2.jpg`, `images/bicycles-2.jpg`, `images/bicycles-3.jpg`, `images/dining-table-2.jpg`, `images/dining-table-3.jpg`, `images/tv-2.jpg`, `images/wardrobe-2.jpg`, `images/mirror-cabinet-2.jpg`, `images/chest-8-drawers-2.jpg`, `images/daybed-2.jpg`, `images/eket-cabinet-2.jpg`, `images/mesh-basket-2.jpg`, `images/wall-lamps-2.jpg`, `images/blinds-2.jpg`
- Rename: `images/sofa.jpg`→`images/sofa-1.jpg`, `images/bicycles.jpg`→`images/bicycles-1.jpg`, `images/dining-table.jpg`→`images/dining-table-1.jpg`, `images/tv.jpg`→`images/tv-1.jpg`, `images/wardrobe.jpg`→`images/wardrobe-1.jpg`, `images/mirror-cabinet.jpg`→`images/mirror-cabinet-1.jpg`, `images/chest-8-drawers.jpg`→`images/chest-8-drawers-1.jpg`, `images/daybed.jpg`→`images/daybed-1.jpg`, `images/eket-cabinet.jpg`→`images/eket-cabinet-1.jpg`, `images/mesh-basket.jpg`→`images/mesh-basket-1.jpg`, `images/wall-lamps.jpg`→`images/wall-lamps-1.jpg`, `images/blinds.jpg`→`images/blinds-1.jpg`

**Interfaces:**
- Consumes: the `images` array schema and `isValidItem` from Task 1 — every entry in the rewritten `items.json` must satisfy it.
- Produces: real photo files on disk and a migrated `items.json` that Tasks 3–5 use for visual and interactive verification. `deals.json` needs no change — it is currently `[]`.

The extra source photos already exist on disk (extracted from the seller's PDF earlier this session) at
`/private/tmp/claude-501/-Users-mistergreen-development-rafael-move-out-website/621f8b38-9c41-473b-b727-fd975f76a146/scratchpad/pdf_images/`
— this task only resizes/renames them into the project's `images/` directory, it does not re-extract them.

- [ ] **Step 1: Rename the existing single photos to a `-1` suffix**

```bash
git mv images/sofa.jpg images/sofa-1.jpg
git mv images/bicycles.jpg images/bicycles-1.jpg
git mv images/dining-table.jpg images/dining-table-1.jpg
git mv images/tv.jpg images/tv-1.jpg
git mv images/wardrobe.jpg images/wardrobe-1.jpg
git mv images/mirror-cabinet.jpg images/mirror-cabinet-1.jpg
git mv images/chest-8-drawers.jpg images/chest-8-drawers-1.jpg
git mv images/daybed.jpg images/daybed-1.jpg
git mv images/eket-cabinet.jpg images/eket-cabinet-1.jpg
git mv images/mesh-basket.jpg images/mesh-basket-1.jpg
git mv images/wall-lamps.jpg images/wall-lamps-1.jpg
git mv images/blinds.jpg images/blinds-1.jpg
```

`images/chest-4-drawers.jpg`, `images/tv-bench.jpg`, `images/mirror.jpg`, and `images/router.jpg` are NOT renamed — those four items only have one usable photo each and keep their existing filename.

- [ ] **Step 2: Process the additional photos into `images/`**

```bash
SCRATCH=/private/tmp/claude-501/-Users-mistergreen-development-rafael-move-out-website/621f8b38-9c41-473b-b727-fd975f76a146/scratchpad/pdf_images

sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page03_img1_24.jpeg" --out images/sofa-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page05_img4_41.jpeg" --out images/bicycles-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page06_img1_51.jpeg" --out images/bicycles-3.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page08_img1_69.jpeg" --out images/dining-table-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page08_img3_71.jpeg" --out images/dining-table-3.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page10_img2_88.jpeg" --out images/tv-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page13_img2_113.jpeg" --out images/wardrobe-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page15_img3_128.jpeg" --out images/mirror-cabinet-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page17_img2_143.jpeg" --out images/chest-8-drawers-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page22_img2_178.jpeg" --out images/daybed-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page24_img2_192.jpeg" --out images/eket-cabinet-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page26_img1_205.jpeg" --out images/mesh-basket-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page28_img1_221.jpeg" --out images/wall-lamps-2.jpg
sips -Z 1000 -s format jpeg -s formatOptions 78 "$SCRATCH/page30_img2_240.jpeg" --out images/blinds-2.jpg

git add images/sofa-2.jpg images/bicycles-2.jpg images/bicycles-3.jpg images/dining-table-2.jpg images/dining-table-3.jpg images/tv-2.jpg images/wardrobe-2.jpg images/mirror-cabinet-2.jpg images/chest-8-drawers-2.jpg images/daybed-2.jpg images/eket-cabinet-2.jpg images/mesh-basket-2.jpg images/wall-lamps-2.jpg images/blinds-2.jpg
```

Do NOT process a second router photo — a candidate photo at `$SCRATCH/page29_img2_231.jpeg` shows the TP-Link router's label with its WiFi password, MAC address, and IMEI clearly legible, and must not be used or committed anywhere, per the Global Constraints.

- [ ] **Step 3: Rewrite `items.json`**

Replace the full contents of `items.json`:

```json
[
  {
    "id": "jaxx-sofa",
    "title": "JAXX Choice Sofa",
    "price": 800,
    "badge": "8 Months Old",
    "specs": ["2,5 seats", "Width: 213 cm", "Waterproof, 5-year warranty against stains"],
    "description": "JAXX Choice sofa in great condition, only 8 months of use.",
    "images": ["images/sofa-1.jpg", "images/sofa-2.jpg"]
  },
  {
    "id": "bicycles-set",
    "title": "2 Bicycles + Child Seat",
    "price": 500,
    "badge": "5 Years Old",
    "specs": ["Batavus men's bicycle, Fonk model", "Batavus women's bicycle, Fonk model", "Urban Iki front child seat, up to 15 kg"],
    "description": "Two Batavus city bicycles (Fonk model), sold together with a 1-year-old Urban Iki front child seat.",
    "images": ["images/bicycles-1.jpg", "images/bicycles-2.jpg", "images/bicycles-3.jpg"]
  },
  {
    "id": "dining-table-chairs",
    "title": "Dining Table + 6 Chairs",
    "price": 300,
    "specs": ["Table: wood and white, 100 x 200 cm", "6x IKEA BERGMUND chair frames, white", "Removable, washable Hallarp beige chair covers"],
    "description": "Dining table with 6 matching IKEA BERGMUND chairs.",
    "images": ["images/dining-table-1.jpg", "images/dining-table-2.jpg", "images/dining-table-3.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/bergmund-chair-frame-white-40451905/"
  },
  {
    "id": "lg-tv",
    "title": "LG Smart TV OLED 55\"",
    "price": 350,
    "badge": "4 Years Old",
    "specs": ["OLED display", "120Hz refresh rate"],
    "description": "LG Smart TV OLED 55\", 4 years of use.",
    "images": ["images/tv-1.jpg", "images/tv-2.jpg"]
  },
  {
    "id": "elvarli-wardrobe",
    "title": "IKEA ELVARLI Wardrobe Combination",
    "price": 150,
    "specs": ["2 units", "Wardrobe combination (4 drawers), white, 165 x 55 x 216 cm", "Wardrobe combination (3 shelves), white, 84 x 40 x 216 cm"],
    "description": "Modular ELVARLI wardrobe combination, flexible open storage system.",
    "images": ["images/wardrobe-1.jpg", "images/wardrobe-2.jpg"],
    "specsLink": "https://www.ikea.com/nl/nl/cat/elvarli-systeem-35766/"
  },
  {
    "id": "hemnes-mirror-cabinet",
    "title": "IKEA Hemnes High Cabinet with Mirror Door",
    "price": 50,
    "badge": "Has a Damage Hole",
    "specs": ["White", "49 x 31 x 200 cm"],
    "description": "Hemnes high cabinet with mirror door. Has a damage hole — check the photo.",
    "images": ["images/mirror-cabinet-1.jpg", "images/mirror-cabinet-2.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/hemnes-high-cabinet-with-mirror-door-white-70217685/"
  },
  {
    "id": "hemnes-chest-8",
    "title": "IKEA Hemnes Chest of 8 Drawers",
    "price": 70,
    "specs": ["White stain", "160 x 96 cm"],
    "description": "Hemnes chest of 8 drawers, white stain finish.",
    "images": ["images/chest-8-drawers-1.jpg", "images/chest-8-drawers-2.jpg"],
    "specsLink": "https://www.ikea.com/nl/nl/p/hemnes-ladekast-8-lades-wit-gebeitst-10239280/"
  },
  {
    "id": "malm-chest-4",
    "title": "IKEA Malm Chest of 4 Drawers",
    "price": 25,
    "specs": ["White", "80 x 100 cm"],
    "description": "Malm chest of 4 drawers, white.",
    "images": ["images/chest-4-drawers.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/malm-chest-of-4-drawers-white-30403571/"
  },
  {
    "id": "hemnes-tv-bench",
    "title": "IKEA Hemnes TV Bench",
    "price": 25,
    "specs": ["White stain", "Width: 180 cm"],
    "description": "Hemnes TV bench, white stain finish.",
    "images": ["images/tv-bench.jpg"]
  },
  {
    "id": "hemnes-daybed",
    "title": "IKEA Hemnes Day-bed Frame",
    "price": 100,
    "badge": "Signs of Use",
    "specs": ["3 drawers", "White", "80 x 200 cm"],
    "description": "Hemnes day-bed frame with 3 drawers. Has some signs of use.",
    "images": ["images/daybed-1.jpg", "images/daybed-2.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/hemnes-day-bed-frame-with-3-drawers-white-90349326/"
  },
  {
    "id": "eket-cabinet",
    "title": "IKEA EKET Cabinet, Oak Effect",
    "price": 15,
    "specs": ["2 units", "Wall-mounted shelving unit", "35 x 25 x 35 cm"],
    "description": "EKET wall-mounted shelving units, white stained oak effect.",
    "images": ["images/eket-cabinet-1.jpg", "images/eket-cabinet-2.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/eket-wall-mounted-shelving-unit-white-stained-oak-effect-s29286257/"
  },
  {
    "id": "boaxel-mesh-basket",
    "title": "IKEA BOAXEL Mesh Basket",
    "price": 25,
    "badge": "New, Never Installed",
    "specs": ["3 units", "White", "60 x 40 x 15 cm", "Includes brackets and wall upright"],
    "description": "BOAXEL mesh baskets, new and never installed, includes mounting hardware.",
    "images": ["images/mesh-basket-1.jpg", "images/mesh-basket-2.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/boaxel-mesh-basket-white-20448749/"
  },
  {
    "id": "nissedal-mirror",
    "title": "IKEA NISSEDAL Mirror",
    "price": 15,
    "badge": "New",
    "specs": ["White stained oak effect", "40 x 150 cm"],
    "description": "NISSEDAL mirror, brand new.",
    "images": ["images/mirror.jpg"],
    "specsLink": "https://www.ikea.com/nl/en/p/nissedal-mirror-white-stained-oak-effect-80390868/"
  },
  {
    "id": "fonq-wall-lamps",
    "title": "FONQ Wall Lamps (Set of 2)",
    "price": 40,
    "badge": "New in Box",
    "specs": ["2 units", "Color: gold", "15 x 20 cm"],
    "description": "FONQ trio-pure wall lamps, gold, new in the box.",
    "images": ["images/wall-lamps-1.jpg", "images/wall-lamps-2.jpg"]
  },
  {
    "id": "tp-link-router",
    "title": "TP-Link Router",
    "price": 0,
    "badge": "Donation",
    "description": "Free to a good home — working TP-Link router.",
    "images": ["images/router.jpg"]
  },
  {
    "id": "venetian-blinds",
    "title": "Blinds Venetia",
    "price": 0,
    "badge": "Donation",
    "specs": ["2 units", "1,50 m width x 1,55 m height"],
    "description": "Free Venetian blinds, 2 units.",
    "images": ["images/blinds-1.jpg", "images/blinds-2.jpg"]
  }
]
```

- [ ] **Step 4: Verify with a Node integration check**

Run (from the project root):

```bash
node -e "
const fs = require('fs');
const { buildCardList, isValidItem, isValidDeal } = require('./render.js');
const items = JSON.parse(fs.readFileSync('items.json', 'utf8'));
const deals = JSON.parse(fs.readFileSync('deals.json', 'utf8'));
console.log('items:', items.length, 'valid:', items.filter(isValidItem).length);
items.forEach(function (i) { if (!isValidItem(i)) console.log('INVALID ITEM:', i.id); });
items.forEach(function (i) {
  i.images.forEach(function (src) {
    if (!fs.existsSync(src)) console.log('MISSING IMAGE:', i.id, src);
  });
});
const html = buildCardList(items, deals, 'all');
const cardCount = (html.match(/class=\"card /g) || []).length;
console.log('rendered cards:', cardCount);
console.log('multi-photo cards:', (html.match(/card__carousel-arrow--prev/g) || []).length);
"
```

Expected output: `items: 16 valid: 16`, no `INVALID ITEM` or `MISSING IMAGE` lines, `rendered cards: 16`, `multi-photo cards: 12`.

- [ ] **Step 5: Run the render.js test suite to confirm nothing regressed**

Run: `node --test render.test.js`
Expected: PASS — 23 tests passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add items.json
git commit -m "content: migrate items.json to multi-photo images arrays"
```

---

### Task 3: Carousel styling in `styles.css`

**Files:**
- Modify: `styles.css`

**Interfaces:**
- Consumes: the CSS class contract from Task 1 (`card__carousel`, `card__carousel-track`, `card__carousel-slide`, `card__carousel-arrow--prev`/`--next`, `card__carousel-dots`, `card__carousel-dot`, `card__carousel-dot--active`).
- Produces: `.card__carousel-slide { flex: 0 0 100%; }` — Task 4's `app.js` relies on each slide being exactly `track.clientWidth` wide to compute scroll offsets.

- [ ] **Step 1: Remove the old single-image rule**

In `styles.css`, delete this rule (the image is no longer rendered directly inside `.card` — it's inside `.card__carousel-track` now, styled by the new rules in Step 2):

```css
.card__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-bottom: var(--border-thick);
  display: block;
}
```

- [ ] **Step 2: Add the carousel rules**

Add these rules to `styles.css` in place of the block removed in Step 1:

```css
.card__carousel {
  position: relative;
}

.card__carousel-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  border-bottom: var(--border-thick);
}

.card__carousel-track::-webkit-scrollbar {
  display: none;
}

.card__carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  scroll-snap-align: start;
  display: block;
}

.card__carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(17, 17, 17, 0.7);
  color: #ffffff;
  border: var(--border-thin);
  width: 2rem;
  height: 2rem;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  z-index: 1;
}

.card__carousel-arrow--prev {
  left: 0.5rem;
}

.card__carousel-arrow--next {
  right: 0.5rem;
}

.card__carousel-dots {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.4rem;
  z-index: 1;
}

.card__carousel-dot {
  width: 0.6rem;
  height: 0.6rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--color-black);
  padding: 0;
  cursor: pointer;
}

.card__carousel-dot--active {
  background: var(--color-yellow);
}
```

- [ ] **Step 3: Verify the file is well-formed and the classes are present**

Run:

```bash
python3 -c "
content = open('styles.css').read()
assert content.count('{') == content.count('}'), 'unbalanced braces'
for cls in ['.card__carousel {', '.card__carousel-track {', '.card__carousel-slide {', '.card__carousel-arrow {', '.card__carousel-arrow--prev {', '.card__carousel-arrow--next {', '.card__carousel-dots {', '.card__carousel-dot {', '.card__carousel-dot--active {']:
    assert cls in content, 'missing rule: ' + cls
assert '.card__image {' not in content, 'old .card__image rule was not removed'
print('OK')
"
```

Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "feat: add carousel styling (strip, arrows, dots)"
```

---

### Task 4: Carousel interaction in `app.js`

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: the DOM/class contract from Task 1 and the CSS behavior from Task 3 (`.card__carousel-slide` is exactly `track.clientWidth` wide, so `index * track.clientWidth` addresses slide `index`).
- Produces: working arrow-click, dot-click, and swipe-driven active-dot sync. No later task depends on `app.js` internals.

- [ ] **Step 1: Add the carousel wiring function and call it from `render()`**

In `app.js`, replace:

```js
  function render() {
    grid.innerHTML = window.MovingSale.buildCardList(state.items, state.deals, state.filter);
  }
```

with:

```js
  function render() {
    grid.innerHTML = window.MovingSale.buildCardList(state.items, state.deals, state.filter);
    wireCarousels();
  }

  function wireCarousels() {
    const carousels = grid.querySelectorAll(".card__carousel");
    carousels.forEach(function (carousel) {
      const track = carousel.querySelector(".card__carousel-track");
      const prevBtn = carousel.querySelector(".card__carousel-arrow--prev");
      const nextBtn = carousel.querySelector(".card__carousel-arrow--next");
      const dots = carousel.querySelectorAll(".card__carousel-dot");

      if (!prevBtn || !nextBtn) {
        return;
      }

      prevBtn.addEventListener("click", function () {
        track.scrollBy({ left: -track.clientWidth, behavior: "smooth" });
      });

      nextBtn.addEventListener("click", function () {
        track.scrollBy({ left: track.clientWidth, behavior: "smooth" });
      });

      dots.forEach(function (dot, index) {
        dot.addEventListener("click", function () {
          track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
        });
      });

      let scrollTimeout = null;
      track.addEventListener("scroll", function () {
        window.clearTimeout(scrollTimeout);
        scrollTimeout = window.setTimeout(function () {
          const activeIndex = Math.round(track.scrollLeft / track.clientWidth);
          dots.forEach(function (dot, index) {
            const isActive = index === activeIndex;
            dot.classList.toggle("card__carousel-dot--active", isActive);
            if (isActive) {
              dot.setAttribute("aria-current", "true");
            } else {
              dot.removeAttribute("aria-current");
            }
          });
        }, 150);
      });
    });
  }
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run: `node -c app.js`
Expected: no output (a clean exit means the syntax is valid; this does not execute the DOM-dependent code, since `document` doesn't exist in plain Node — that's covered by Task 5's browser-based check).

- [ ] **Step 3: Verify the wiring is structurally correct**

Run:

```bash
grep -n "wireCarousels" app.js
grep -c "addEventListener" app.js
```

Expected: `wireCarousels` appears twice (its definition and the call inside `render()`), and `addEventListener` count is at least 5 (filter buttons loop + prev + next + dot + scroll).

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "feat: wire carousel arrow, dot, and swipe interaction"
```

---

### Task 5: Documentation and final end-to-end verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- None — this task documents the finished feature and closes out the plan with a real browser-driven check of the whole thing working together.

- [ ] **Step 1: Update `README.md`'s schema documentation**

In `README.md`, replace:

```markdown
- `image` (string, required) — path under `images/`
```

with:

```markdown
- `images` (array of strings, required, at least one) — paths under `images/`; the first photo shows first, and additional photos appear in a swipeable carousel with arrow buttons and dot navigation
```

Replace:

```markdown
- `id`, `name`, `price`, `image` — required
```

with:

```markdown
- `id`, `name`, `price`, `images` — required (`images` is an array of one or more paths under `images/`, same as for items)
```

Replace the "Adding photos" section body:

```markdown
Drop image files into `images/` and reference the filename (e.g. `images/sofa.jpg`) from `items.json`/`deals.json`. Cards display images at a 4:3 aspect ratio (`object-fit: cover`), so a roughly 4:3 source photo looks best. If an image fails to load, the placeholder graphic in `images/placeholder.svg` is shown automatically.
```

with:

```markdown
Drop image files into `images/` and list their paths in the `images` array (e.g. `"images": ["images/sofa-1.jpg", "images/sofa-2.jpg"]`) from `items.json`/`deals.json`. Cards display each photo at a 4:3 aspect ratio (`object-fit: cover`), so roughly 4:3 source photos look best. List one path for a single photo, or two or more for a carousel with arrow buttons and dot navigation. If a photo fails to load, the placeholder graphic in `images/placeholder.svg` is shown for that photo only — the rest of the carousel is unaffected.
```

- [ ] **Step 2: Run the full render.js test suite**

Run: `node --test render.test.js`
Expected: PASS — 23 tests passing, 0 failing.

- [ ] **Step 3: Set up a throwaway Playwright environment**

This is dev-time only — nothing here is added to the project or committed.

```bash
PWDIR=$(mktemp -d)
cd "$PWDIR"
npm init -y >/dev/null 2>&1
npm install --no-audit --no-fund playwright >/tmp/pw_install.log 2>&1
npx playwright install chromium >/tmp/pw_browser_install.log 2>&1
tail -3 /tmp/pw_browser_install.log
```

Expected: the last line confirms Chromium is downloaded (or already cached from a prior run).

- [ ] **Step 4: Serve the site locally**

From the project root (a different terminal/subshell than Step 3, or `cd` back first):

```bash
cd /Users/mistergreen/development/rafael/move-out-website
pkill -f "http.server 8123" 2>/dev/null
python3 -m http.server 8123 >/tmp/server.log 2>&1 &
sleep 1
curl -sf http://localhost:8123/index.html >/dev/null && echo "server up"
```

Expected: `server up`

- [ ] **Step 5: Drive the carousel with a headless browser and screenshot the result**

Write this script to `$PWDIR/check.js` (reuse the `$PWDIR` from Step 3 — if it's a different shell, re-run `PWDIR=$(mktemp -d)` there and redo Step 3's `npm install`/`playwright install` in that same directory first):

```js
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1600 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("http://localhost:8123", { waitUntil: "networkidle" });
  await page.waitForSelector(".card");
  await page.waitForTimeout(1000); // let the staggered card-reveal animation finish

  // The sofa is the first item card and has 2 photos.
  const sofaCarousel = page.locator(".card--item").first().locator(".card__carousel");
  const track = sofaCarousel.locator(".card__carousel-track");

  const scrollBefore = await track.evaluate((el) => el.scrollLeft);
  await sofaCarousel.locator(".card__carousel-arrow--next").click();
  await page.waitForTimeout(500);
  const scrollAfterArrow = await track.evaluate((el) => el.scrollLeft);
  console.log("scroll after next-arrow click (expect > 0):", scrollAfterArrow, "was:", scrollBefore);

  const dots = sofaCarousel.locator(".card__carousel-dot");
  await dots.nth(0).click();
  await page.waitForTimeout(500);
  const scrollAfterDot = await track.evaluate((el) => el.scrollLeft);
  console.log("scroll after first-dot click (expect 0):", scrollAfterDot);

  const trackWidth = await track.evaluate((el) => el.clientWidth);
  await track.evaluate((el, w) => { el.scrollLeft = w; }, trackWidth);
  await page.waitForTimeout(500);
  const activeDotAfterSwipeSim = await sofaCarousel.locator(".card__carousel-dot--active").getAttribute("aria-label");
  console.log("active dot label after simulated swipe to photo 2 (expect 'Photo 2'):", activeDotAfterSwipeSim);

  const routerCard = page.locator(".card__title", { hasText: "TP-Link Router" }).locator("..").locator("..");
  const routerArrowCount = await routerCard.locator(".card__carousel-arrow").count();
  console.log("router (single photo) arrow count (expect 0):", routerArrowCount);

  await page.screenshot({ path: `${process.argv[2]}/carousel-check.png` });
  console.log("console errors:", JSON.stringify(errors));

  await browser.close();
})();
```

Run it:

```bash
node "$PWDIR/check.js" "$PWDIR"
```

Expected output: scroll-after-arrow greater than 0, scroll-after-dot equal to 0, active dot label `Photo 2`, router arrow count `0`, and `console errors: []`.

- [ ] **Step 6: Look at the screenshot**

Read the file at `$PWDIR/carousel-check.png` (print its path with `echo "$PWDIR/carousel-check.png"` if needed) and confirm visually: the sofa card shows a photo with square black-bordered arrow buttons and yellow-accented dots in the De Stijl style, no arrows/dots on single-photo cards, and no layout breakage elsewhere on the page.

- [ ] **Step 7: Stop the local server**

```bash
pkill -f "http.server 8123" 2>/dev/null
echo done
```

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs: update schema docs for multi-photo images array"
```
