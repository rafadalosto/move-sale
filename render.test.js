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
