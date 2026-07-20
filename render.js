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
