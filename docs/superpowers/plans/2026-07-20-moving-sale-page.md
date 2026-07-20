# Rafael's Moving Sale Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page static site listing Rafael's moving-sale items and deals, hand-edited via JSON files and deployable to GitHub Pages with no build step.

**Architecture:** Plain HTML/CSS/vanilla JS. A dependency-free logic module (`render.js`) holds pure formatting/validation/HTML-building functions, dual-loaded as a browser global (via a classic `<script>` tag) and as a Node CommonJS module (for tests) using a small UMD wrapper — no bundler, no `package.json`, no npm install. `app.js` fetches `items.json`/`deals.json` and wires them to the DOM using `render.js`. Pure logic is covered by Node's built-in test runner (`node --test`, ships with Node, zero install); DOM wiring and visuals are verified manually in a browser, per the spec's decision to skip an automated test suite.

**Tech Stack:** HTML5, CSS3 (CSS Grid, CSS variables, CSS animations), vanilla JS (ES5-compatible, no modules, no framework), Node's built-in `node:test`/`node:assert` for pure-logic tests, Google Fonts (Archivo / Archivo Black) loaded via `<link>` for distinctive typography.

## Global Constraints

- No build tooling and no npm dependency required to run or deploy the site — GitHub Pages must be able to serve the repo root as-is.
- No automated test suite is required or expected for deployment; `node --test` is a dev-time-only convenience for the pure logic in `render.js`.
- Contact is WhatsApp-only: `https://wa.me/31620659657`. No phone "Call" button anywhere.
- Visual direction is Dutch De Stijl: bold primary-color blocks (red `#e0201f`, blue `#1a3fa0`, yellow `#f5c400`) on white, thick black rule lines, a geometric/slab display font (not Inter/Arial/system fonts), sharp square corners, no gradients, no rounded corners.
- Language is English throughout.
- Prices render as `EUR <whole>,<decimals>` (comma decimal separator, no thousands separator), e.g. `EUR 800,00`.
- Under the `All` filter, deal cards render before item cards; under the `Deals` filter, only deal cards render.
- An item belongs to at most one deal, expressed by its own optional `dealName`/`dealLink` fields — `deals.json` never references `items.json`.
- Deals are fixed, hand-authored bundles; their `items` field is a display-only array of names, not a live join.

---

### Task 1: Pure formatting & validation logic

**Files:**
- Create: `render.js`
- Create: `render.test.js`

**Interfaces:**
- Produces: `formatPrice(price: number): string`, `isValidItem(item: object): boolean`, `isValidDeal(deal: object): boolean`, all exported from `render.js` as `module.exports` (Node) / `window.MovingSale` (browser) via a UMD wrapper.

- [ ] **Step 1: Write the failing tests**

Create `render.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { formatPrice, isValidItem, isValidDeal } = require("./render.js");

test("formatPrice formats whole euros with two decimals", () => {
  assert.equal(formatPrice(800), "EUR 800,00");
});

test("formatPrice formats cents correctly", () => {
  assert.equal(formatPrice(349.5), "EUR 349,50");
});

test("formatPrice formats a small price", () => {
  assert.equal(formatPrice(15), "EUR 15,00");
});

test("isValidItem accepts an item with title, price, and image", () => {
  assert.equal(
    isValidItem({ title: "Sofa", price: 800, image: "images/sofa.jpg" }),
    true
  );
});

test("isValidItem rejects an item missing price", () => {
  assert.equal(
    isValidItem({ title: "Sofa", image: "images/sofa.jpg" }),
    false
  );
});

test("isValidItem rejects an item with an empty title", () => {
  assert.equal(
    isValidItem({ title: "  ", price: 10, image: "images/x.jpg" }),
    false
  );
});

test("isValidDeal accepts a deal with name, price, and image", () => {
  assert.equal(
    isValidDeal({ name: "Combo", price: 1000, image: "images/combo.jpg" }),
    true
  );
});

test("isValidDeal rejects a deal missing image", () => {
  assert.equal(isValidDeal({ name: "Combo", price: 1000 }), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test render.test.js`
Expected: FAIL — Node reports an error requiring `./render.js` (`Cannot find module`), since the file doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `render.js`:

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

  function isValidItem(item) {
    return Boolean(
      item &&
      typeof item.title === "string" && item.title.trim() !== "" &&
      typeof item.price === "number" && !Number.isNaN(item.price) &&
      typeof item.image === "string" && item.image.trim() !== ""
    );
  }

  function isValidDeal(deal) {
    return Boolean(
      deal &&
      typeof deal.name === "string" && deal.name.trim() !== "" &&
      typeof deal.price === "number" && !Number.isNaN(deal.price) &&
      typeof deal.image === "string" && deal.image.trim() !== ""
    );
  }

  return {
    formatPrice: formatPrice,
    isValidItem: isValidItem,
    isValidDeal: isValidDeal,
  };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test render.test.js`
Expected: PASS — 8 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add render.js render.test.js
git commit -m "feat: add price formatting and item/deal validation logic"
```

---

### Task 2: Card HTML builders

**Files:**
- Modify: `render.js` (rewrite in full)
- Modify: `render.test.js` (append tests)
- Create: `images/placeholder.svg`

**Interfaces:**
- Consumes: `formatPrice(price: number): string` from Task 1.
- Produces: `renderItemCardHTML(item: object): string`, `renderDealCardHTML(deal: object): string`, both added to the same exported object from Task 1. Assumes callers already filtered inputs with `isValidItem`/`isValidDeal`.
- Both functions emit markup depending on these CSS class names (consumed by Task 4's `styles.css`): `card`, `card--item`, `card--deal`, `card__badge`, `card__badge--delivery`, `card__image`, `card__body`, `card__price`, `card__price-original`, `card__title`, `card__specs`, `card__description`, `card__deal-tag`, `card__cta`.
- On an image load failure, the `<img>` falls back to `images/placeholder.svg` (created in this task) via an inline `onerror` handler.

- [ ] **Step 1: Write the failing tests**

Append to `render.test.js` (before the final closing of the file — just add these `test(...)` blocks after the existing ones):

```js
const { renderItemCardHTML, renderDealCardHTML } = require("./render.js");

test("renderItemCardHTML includes price, title, and badge", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "JAXX Choice Sofa",
    price: 800,
    badge: "8 Mos Old",
    image: "images/sofa.jpg",
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
    image: "images/x.jpg",
  });
  assert.equal(html.includes("<sale>"), false);
  assert.match(html, /Rafael&#39;s &quot;Best&quot; Sofa &lt;sale&gt;/);
});

test("renderItemCardHTML adds a deal tag when dealName/dealLink are set", () => {
  const html = renderItemCardHTML({
    id: "sofa",
    title: "Sofa",
    price: 800,
    image: "images/sofa.jpg",
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
    image: "images/sofa.jpg",
  });
  assert.equal(html.includes("card__deal-tag"), false);
});

test("renderDealCardHTML includes price, original price, and free delivery badge", () => {
  const html = renderDealCardHTML({
    id: "combo",
    name: "Living Room Combo",
    price: 1000,
    originalPrice: 1150,
    freeDelivery: true,
    image: "images/combo.jpg",
  });
  assert.match(html, /EUR 1000,00/);
  assert.match(html, /EUR 1150,00/);
  assert.match(html, /Free delivery/);
  assert.match(html, /class="card card--deal"/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test render.test.js`
Expected: FAIL — `renderItemCardHTML`/`renderDealCardHTML` are `undefined` (not yet exported from `render.js`).

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

  function isValidItem(item) {
    return Boolean(
      item &&
      typeof item.title === "string" && item.title.trim() !== "" &&
      typeof item.price === "number" && !Number.isNaN(item.price) &&
      typeof item.image === "string" && item.image.trim() !== ""
    );
  }

  function isValidDeal(deal) {
    return Boolean(
      deal &&
      typeof deal.name === "string" && deal.name.trim() !== "" &&
      typeof deal.price === "number" && !Number.isNaN(deal.price) &&
      typeof deal.image === "string" && deal.image.trim() !== ""
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
      '<img class="card__image" src="' + escapeHTML(item.image) + '" alt="' + escapeHTML(item.title) +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'">' +
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
      '<img class="card__image" src="' + escapeHTML(deal.image) + '" alt="' + escapeHTML(deal.name) +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'images/placeholder.svg\'">' +
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

  return {
    formatPrice: formatPrice,
    isValidItem: isValidItem,
    isValidDeal: isValidDeal,
    renderItemCardHTML: renderItemCardHTML,
    renderDealCardHTML: renderDealCardHTML,
  };
});
```

- [ ] **Step 4: Create the placeholder image**

Create `images/placeholder.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="Image not available">
  <rect width="400" height="300" fill="#ffffff" stroke="#111111" stroke-width="6"/>
  <rect x="20" y="20" width="60" height="60" fill="#e0201f"/>
  <line x1="0" y1="0" x2="400" y2="300" stroke="#111111" stroke-width="3"/>
  <line x1="400" y1="0" x2="0" y2="300" stroke="#111111" stroke-width="3"/>
</svg>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test render.test.js`
Expected: PASS — 13 tests passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add render.js render.test.js images/placeholder.svg
git commit -m "feat: add item/deal card HTML builders with image fallback"
```

---

### Task 3: Card list ordering & filtering

**Files:**
- Modify: `render.js` (rewrite in full)
- Modify: `render.test.js` (append tests)

**Interfaces:**
- Consumes: `isValidItem`, `isValidDeal`, `renderItemCardHTML`, `renderDealCardHTML` from Tasks 1-2 (used internally, not passed in).
- Produces: `buildCardList(items: array, deals: array, filter: "all" | "deals"): string` — returns the full HTML string to assign to the grid container's `innerHTML`. Filters out invalid entries internally. Under `"all"`, deal cards come first, then item cards, both in input array order. Under `"deals"`, only deal cards are returned.

- [ ] **Step 1: Write the failing tests**

Append to `render.test.js`:

```js
const { buildCardList } = require("./render.js");

test("buildCardList puts deals before items under the 'all' filter", () => {
  const items = [{ id: "a", title: "Item A", price: 1, image: "a.jpg" }];
  const deals = [{ id: "d", name: "Deal D", price: 2, image: "d.jpg" }];
  const html = buildCardList(items, deals, "all");
  assert.ok(html.indexOf("Deal D") < html.indexOf("Item A"));
});

test("buildCardList returns only deal cards under the 'deals' filter", () => {
  const items = [{ id: "a", title: "Item A", price: 1, image: "a.jpg" }];
  const deals = [{ id: "d", name: "Deal D", price: 2, image: "d.jpg" }];
  const html = buildCardList(items, deals, "deals");
  assert.match(html, /Deal D/);
  assert.equal(html.includes("Item A"), false);
});

test("buildCardList skips invalid items and deals", () => {
  const items = [{ id: "a", title: "Item A", price: 1, image: "a.jpg" }, { id: "bad" }];
  const deals = [{ id: "d", name: "Deal D", price: 2, image: "d.jpg" }, { id: "bad" }];
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
Expected: FAIL — `buildCardList` is `undefined` (not yet exported from `render.js`).

- [ ] **Step 3: Write the implementation**

In `render.js`, add `buildCardList` inside the factory function (after `renderDealCardHTML`) and add it to the returned object:

```js
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
```

And update the returned object at the bottom of the factory to:

```js
  return {
    formatPrice: formatPrice,
    isValidItem: isValidItem,
    isValidDeal: isValidDeal,
    renderItemCardHTML: renderItemCardHTML,
    renderDealCardHTML: renderDealCardHTML,
    buildCardList: buildCardList,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test render.test.js`
Expected: PASS — 17 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add render.js render.test.js
git commit -m "feat: add deal-first card list ordering and filtering"
```

---

### Task 4: Page shell and De Stijl styling

**Files:**
- Create: `index.html`
- Create: `styles.css`

**Interfaces:**
- Produces the static DOM structure and CSS classes that Task 5's `app.js` and Task 1-3's `render.js` output depend on: `#grid` (card container), `#load-error` (hidden-by-default error message), `.filter-tabs__btn` elements with a `data-filter="all"` / `data-filter="deals"` attribute and a `.filter-tabs__btn--active` toggle class, plus every `card*` class produced by `render.js` (styled here).
- Loads `render.js` via a classic `<script>` tag (no `app.js` reference yet — added in Task 5).

- [ ] **Step 1: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rafael's Moving Sale — Almere</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700&family=Archivo+Black&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <div class="site-header__inner">
      <h1 class="site-header__title">Rafael's Moving Sale</h1>
      <span class="site-header__location">📍 Almere</span>
      <a class="site-header__whatsapp" href="https://wa.me/31620659657" target="_blank" rel="noopener">💬 WhatsApp</a>
    </div>
  </header>

  <nav class="filter-tabs" aria-label="Filter listings">
    <button type="button" class="filter-tabs__btn filter-tabs__btn--active" data-filter="all">All</button>
    <button type="button" class="filter-tabs__btn" data-filter="deals">Deals</button>
  </nav>

  <main>
    <p id="load-error" class="load-error" hidden>Couldn't load items — try refreshing.</p>
    <div id="grid" class="grid"></div>
  </main>

  <script src="render.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `styles.css`**

```css
:root {
  --color-bg: #ffffff;
  --color-black: #111111;
  --color-red: #e0201f;
  --color-blue: #1a3fa0;
  --color-yellow: #f5c400;
  --font-display: "Archivo Black", "Arial Black", sans-serif;
  --font-body: "Archivo", "Helvetica Neue", sans-serif;
  --border-thick: 4px solid var(--color-black);
  --border-thin: 2px solid var(--color-black);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  font-family: var(--font-body);
  color: var(--color-black);
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-bg);
  border-bottom: var(--border-thick);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  flex-wrap: wrap;
}

.site-header__title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.site-header__location {
  font-size: 0.95rem;
}

.site-header__whatsapp {
  margin-left: auto;
  background: var(--color-blue);
  color: #ffffff;
  border: var(--border-thin);
  padding: 0.6rem 1.2rem;
  font-weight: bold;
  text-decoration: none;
  text-transform: uppercase;
}

.site-header__whatsapp:hover {
  background: var(--color-black);
}

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
}

.filter-tabs__btn {
  font-family: var(--font-display);
  text-transform: uppercase;
  background: var(--color-bg);
  border: var(--border-thin);
  padding: 0.5rem 1.25rem;
  cursor: pointer;
}

.filter-tabs__btn--active {
  background: var(--color-yellow);
}

.load-error {
  margin: 1rem 1.5rem;
  padding: 1rem;
  border: var(--border-thin);
  color: var(--color-red);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  padding: 0 1.5rem 3rem;
  transition: opacity 0.2s ease;
}

.grid.grid--filtering {
  opacity: 0;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 560px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .site-header__whatsapp {
    margin-left: 0;
  }
}

.card {
  position: relative;
  border: var(--border-thick);
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  opacity: 0;
  animation: card-reveal 0.5s ease forwards;
}

.grid > .card:nth-child(1) { animation-delay: 0.05s; }
.grid > .card:nth-child(2) { animation-delay: 0.1s; }
.grid > .card:nth-child(3) { animation-delay: 0.15s; }
.grid > .card:nth-child(4) { animation-delay: 0.2s; }
.grid > .card:nth-child(5) { animation-delay: 0.25s; }
.grid > .card:nth-child(6) { animation-delay: 0.3s; }
.grid > .card:nth-child(n+7) { animation-delay: 0.35s; }

@keyframes card-reveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 8px 8px 0 var(--color-black);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card--deal {
  background: var(--color-yellow);
}

.card__badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: var(--color-red);
  color: #ffffff;
  font-family: var(--font-display);
  font-size: 0.75rem;
  text-transform: uppercase;
  padding: 0.25rem 0.6rem;
  z-index: 1;
}

.card__badge--delivery {
  background: var(--color-blue);
}

.card__image {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-bottom: var(--border-thick);
  display: block;
}

.card__body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card__price {
  font-family: var(--font-display);
  font-size: 1.25rem;
  margin: 0;
}

.card__price-original {
  font-size: 0.95rem;
  font-weight: normal;
  text-decoration: line-through;
  color: #555555;
  margin-left: 0.5rem;
}

.card__title {
  margin: 0;
  font-size: 1.1rem;
}

.card__specs {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
}

.card__description {
  margin: 0;
  font-size: 0.9rem;
}

.card__deal-tag {
  display: inline-block;
  align-self: flex-start;
  background: var(--color-blue);
  color: #ffffff;
  font-size: 0.8rem;
  text-decoration: none;
  padding: 0.3rem 0.6rem;
}

.card__cta {
  align-self: flex-start;
  margin-top: 0.25rem;
  background: var(--color-black);
  color: #ffffff;
  text-decoration: none;
  font-weight: bold;
  padding: 0.5rem 1rem;
}

.card__cta:hover {
  background: var(--color-red);
}
```

- [ ] **Step 3: Verify manually in a browser**

Run: `python3 -m http.server 8000` from the project root, then open `http://localhost:8000`.
Expected: sticky header shows "Rafael's Moving Sale", "📍 Almere", and a blue WhatsApp button in the Archivo Black display font; an "All | Deals" filter bar renders below it with "All" highlighted yellow; the grid area is empty (expected — `app.js` doesn't exist until Task 5); no console errors. Resize the browser and confirm the WhatsApp button drops below the title under ~560px width.

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: add page shell and De Stijl visual styling"
```

---

### Task 5: Data loading, rendering, and filter wiring

**Files:**
- Create: `app.js`
- Create: `items.json`
- Create: `deals.json`
- Create: `images/sample-sofa.svg`, `images/sample-tv.svg`, `images/sample-mirror.svg`, `images/sample-deal.svg`
- Modify: `index.html` (add the `app.js` script tag)

**Interfaces:**
- Consumes: `window.MovingSale.buildCardList(items, deals, filter)` from Task 3; `#grid`, `#load-error`, `.filter-tabs__btn` DOM structure from Task 4.
- Produces: a working page — no downstream tasks depend on `app.js`'s internals.

- [ ] **Step 1: Create sample images**

Create `images/sample-sofa.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#e0201f"/></svg>
```

Create `images/sample-tv.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#1a3fa0"/></svg>
```

Create `images/sample-mirror.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#f5c400"/></svg>
```

Create `images/sample-deal.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="133" height="300" fill="#e0201f"/><rect x="133" width="134" height="300" fill="#1a3fa0"/><rect x="267" width="133" height="300" fill="#f5c400"/></svg>
```

These are De Stijl-styled color-block stand-ins for real photos — replace them with actual product photos in `images/` and update the `image` paths in `items.json`/`deals.json` when ready.

- [ ] **Step 2: Create `deals.json`**

```json
[
  {
    "id": "livingroom-combo",
    "name": "Living Room Combo",
    "price": 1000,
    "originalPrice": 1150,
    "freeDelivery": true,
    "items": ["JAXX Choice Sofa", "IKEA Mirror"],
    "image": "images/sample-deal.svg",
    "link": "https://wa.me/31620659657?text=Hi%2C%20I%27m%20interested%20in%20the%20Living%20Room%20Combo",
    "description": "Buy the sofa and mirror together and save EUR 150, with free delivery in Almere."
  }
]
```

- [ ] **Step 3: Create `items.json`**

```json
[
  {
    "id": "jaxx-sofa",
    "title": "JAXX Choice Sofa",
    "price": 800,
    "badge": "8 Mos Old",
    "specs": ["2,5 seats capacity", "Waterproof fabric"],
    "description": "Beautiful condition, barely used, smoke-free home.",
    "image": "images/sample-sofa.svg",
    "dealName": "Living Room Combo",
    "dealLink": "https://wa.me/31620659657?text=Hi%2C%20I%27m%20interested%20in%20the%20Living%20Room%20Combo"
  },
  {
    "id": "lg-tv",
    "title": "LG Smart TV OLED 55\"",
    "price": 350,
    "badge": "4 Yrs Old",
    "specs": ["120Hz refresh rate", "4 years of use"],
    "description": "Stunning picture, works perfectly, minor stand scuff.",
    "image": "images/sample-tv.svg",
    "specsLink": "https://www.lg.com/nl/tvs"
  },
  {
    "id": "ikea-mirror",
    "title": "IKEA Mirror",
    "price": 15,
    "badge": "New",
    "specs": ["40 x 150 cm", "Brand new condition"],
    "description": "Can be hung horizontally or vertically.",
    "image": "images/sample-mirror.svg",
    "dealName": "Living Room Combo",
    "dealLink": "https://wa.me/31620659657?text=Hi%2C%20I%27m%20interested%20in%20the%20Living%20Room%20Combo"
  }
]
```

- [ ] **Step 4: Create `app.js`**

```js
(function () {
  const grid = document.getElementById("grid");
  const loadError = document.getElementById("load-error");
  const filterButtons = document.querySelectorAll(".filter-tabs__btn");

  const state = { items: [], deals: [], filter: "all" };

  function render() {
    grid.innerHTML = window.MovingSale.buildCardList(state.items, state.deals, state.filter);
  }

  function setFilter(filter) {
    state.filter = filter;
    filterButtons.forEach(function (btn) {
      btn.classList.toggle("filter-tabs__btn--active", btn.dataset.filter === filter);
    });
    grid.classList.add("grid--filtering");
    window.setTimeout(function () {
      render();
      grid.classList.remove("grid--filtering");
    }, 150);
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setFilter(btn.dataset.filter);
    });
  });

  Promise.all([
    fetch("items.json").then(function (res) { return res.json(); }),
    fetch("deals.json").then(function (res) { return res.json(); }),
  ])
    .then(function (results) {
      state.items = results[0];
      state.deals = results[1];
      render();
    })
    .catch(function () {
      loadError.hidden = false;
    });
})();
```

- [ ] **Step 5: Add the script tag to `index.html`**

In `index.html`, change:

```html
  <script src="render.js"></script>
</body>
```

to:

```html
  <script src="render.js"></script>
  <script src="app.js"></script>
</body>
```

- [ ] **Step 6: Verify manually in a browser**

Run: `python3 -m http.server 8000` from the project root, then open `http://localhost:8000`.

Expected, in order:
1. Cards fade/slide in with a staggered reveal: the yellow "Living Room Combo" deal card first, then "JAXX Choice Sofa", "LG Smart TV OLED 55\"", "IKEA Mirror".
2. The deal card shows `EUR 1000,00` with `EUR 1150,00` struck through, a "🚚 Free delivery" badge, and a "View Deal ↗" link.
3. The sofa and mirror cards each show a "🔗 Part of: Living Room Combo" tag; clicking it opens the WhatsApp deep link in a new tab.
4. The TV card shows a "View Specs ↗" button linking to `https://www.lg.com/nl/tvs` in a new tab.
5. Clicking "Deals" in the filter bar fades the grid out and back in showing only the "Living Room Combo" card; clicking "All" restores all four cards, deal first.
6. Hovering a card lifts it with a hard black drop-shadow (no soft blur).
7. Temporarily rename `images/sample-sofa.svg` on disk, refresh, and confirm the sofa card falls back to the `images/placeholder.svg` graphic instead of a broken-image icon — then rename the file back.
8. Resize the browser through ~900px and ~560px and confirm the grid drops from 3 to 2 to 1 columns.

- [ ] **Step 7: Commit**

```bash
git add app.js items.json deals.json images/sample-sofa.svg images/sample-tv.svg images/sample-mirror.svg images/sample-deal.svg index.html
git commit -m "feat: load items/deals from JSON and wire filter interactions"
```

---

### Task 6: Documentation and final verification

**Files:**
- Create: `README.md`

**Interfaces:**
- None — this task documents the finished system for Rafael's future edits and closes out the plan.

- [ ] **Step 1: Write `README.md`**

```markdown
# Rafael's Moving Sale

Single-page static site listing items for sale ahead of a move, hosted on GitHub Pages.

## Adding, editing, or removing an item

Edit `items.json`. Each entry:

- `id` (string, required) — unique slug
- `title` (string, required)
- `price` (number, required) — EUR, e.g. `800` or `349.50`
- `image` (string, required) — path under `images/`
- `badge` (string, optional) — e.g. `"8 Mos Old"`, `"New"`
- `specs` (array of strings, optional) — short bullet points
- `description` (string, optional)
- `specsLink` (string, optional) — full URL, adds a "View Specs ↗" button
- `dealName` / `dealLink` (strings, optional, both-or-neither) — marks the item as part of a deal; shows a "🔗 Part of: {dealName}" tag linking to `dealLink`

To mark something sold, delete its entry from `items.json`.

## Adding, editing, or removing a deal

Edit `deals.json`. Each entry:

- `id`, `name`, `price`, `image` — required
- `originalPrice` (number, optional) — shown struck-through to imply savings
- `freeDelivery` (boolean, optional) — shows a "🚚 Free delivery" badge
- `items` (array of strings, optional) — display-only list of bundled item names
- `link` (string, optional) — outbound URL for the "View Deal ↗" button
- `description` (string, optional)

An item is linked to a deal only through its own `dealName`/`dealLink` fields — `deals.json` does not reference `items.json`.

## Adding photos

Drop image files into `images/` and reference the filename (e.g. `images/sofa.jpg`) from `items.json`/`deals.json`. Cards display images at a 4:3 aspect ratio (`object-fit: cover`), so a roughly 4:3 source photo looks best. If an image fails to load, the placeholder graphic in `images/placeholder.svg` is shown automatically.

## Running locally

`fetch()` of the JSON files requires the page be served over http(s), not opened directly as a `file://` URL. From this directory:

\`\`\`bash
python3 -m http.server 8000
\`\`\`

Then open `http://localhost:8000`.

## Running the logic tests

Pure formatting/rendering logic lives in `render.js` and has tests in `render.test.js`, run with Node's built-in test runner (no install needed):

\`\`\`bash
node --test render.test.js
\`\`\`

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repo's Settings → Pages, set the source to deploy from the `main` branch, root folder.
3. GitHub will publish the site at `https://<username>.github.io/<repo>/`.

No build step is required — the site is served exactly as committed.
```

- [ ] **Step 2: Run the full test suite**

Run: `node --test render.test.js`
Expected: PASS — 17 tests passing, 0 failing.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with editing and deployment instructions"
```
