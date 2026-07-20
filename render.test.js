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
