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
