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
    const dealTag = item.dealName
      ? '<span class="card__deal-tag">🔗 Part of: ' + escapeHTML(item.dealName) + "</span>"
      : "";
    const specsLink = item.specsLink
      ? '<a class="card__cta" href="' + escapeHTML(item.specsLink) +
        '" target="_blank" rel="noopener">View Specs ↗</a>'
      : "";
    const basketBtn = '<button class="card__cta card__basket-btn" type="button" data-id="' +
      escapeHTML(item.id) + '">🛒 Add to my list</button>';

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
      basketBtn +
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
        '" target="_blank" rel="noopener">💬 I want it</a>'
      : "";
    const basketBtn = '<button class="card__cta card__basket-btn" type="button" data-id="' +
      escapeHTML(deal.id) + '">🛒 Add to my list</button>';

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
      basketBtn +
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
