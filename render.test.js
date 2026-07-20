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
