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
