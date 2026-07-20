(function () {
  const grid = document.getElementById("grid");
  const loadError = document.getElementById("load-error");
  const filterButtons = document.querySelectorAll(".filter-tabs__btn");
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.querySelector(".lightbox__close");
  const lightboxPrevBtn = document.querySelector(".lightbox__arrow--prev");
  const lightboxNextBtn = document.querySelector(".lightbox__arrow--next");

  const state = { items: [], deals: [], filter: "all" };
  let lightboxPhotos = [];
  let lightboxIndex = 0;

  function render() {
    grid.innerHTML = window.MovingSale.buildCardList(state.items, state.deals, state.filter);
    wireCarousels();
    wireLightbox();
  }

  function highSrcFor(src) {
    return src.replace(/(\.[a-zA-Z0-9]+)$/, "-HIGH$1");
  }

  function showLightboxPhoto() {
    const photo = lightboxPhotos[lightboxIndex];
    lightboxImage.src = highSrcFor(photo.src);
    lightboxImage.alt = photo.alt;
    const multi = lightboxPhotos.length > 1;
    lightboxPrevBtn.hidden = !multi;
    lightboxNextBtn.hidden = !multi;
  }

  function openLightbox(photos, index) {
    lightboxPhotos = photos;
    lightboxIndex = index;
    showLightboxPhoto();
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.src = "";
    lightboxPhotos = [];
  }

  function lightboxPrev() {
    if (lightboxPhotos.length < 2) {
      return;
    }
    lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    showLightboxPhoto();
  }

  function lightboxNext() {
    if (lightboxPhotos.length < 2) {
      return;
    }
    lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
    showLightboxPhoto();
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrevBtn.addEventListener("click", lightboxPrev);
  lightboxNextBtn.addEventListener("click", lightboxNext);

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (lightbox.hidden) {
      return;
    }
    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      lightboxPrev();
    } else if (event.key === "ArrowRight") {
      lightboxNext();
    }
  });

  function wireLightbox() {
    const tracks = grid.querySelectorAll(".card__carousel-track");
    tracks.forEach(function (track) {
      const slides = track.querySelectorAll(".card__carousel-slide");
      const photos = Array.prototype.map.call(slides, function (slide) {
        return { src: slide.getAttribute("src"), alt: slide.getAttribute("alt") };
      });
      slides.forEach(function (slide, index) {
        slide.addEventListener("click", function () {
          openLightbox(photos, index);
        });
      });
    });
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
        const currentIndex = Math.round(track.scrollLeft / track.clientWidth);
        const targetIndex = (currentIndex - 1 + dots.length) % dots.length;
        track.scrollTo({ left: targetIndex * track.clientWidth, behavior: "smooth" });
      });

      nextBtn.addEventListener("click", function () {
        const currentIndex = Math.round(track.scrollLeft / track.clientWidth);
        const targetIndex = (currentIndex + 1) % dots.length;
        track.scrollTo({ left: targetIndex * track.clientWidth, behavior: "smooth" });
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
