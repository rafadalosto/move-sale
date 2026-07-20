(function () {
  const grid = document.getElementById("grid");
  const loadError = document.getElementById("load-error");
  const filterButtons = document.querySelectorAll(".filter-tabs__btn");

  const state = { items: [], deals: [], filter: "all" };

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

  function setFilter(filter) {
    state.filter = filter;
    filterButtons.forEach(function (btn) {
      btn.classList.toggle("filter-tabs__btn--active", btn.dataset.filter === filter);
    });
    grid.classList.add("grid--filtering");
    window.setTimeout(function () {
      render();
      grid.classList.remove("grid--filtering");
    }, 200);
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
