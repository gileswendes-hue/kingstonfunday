(function () {
  'use strict';

  const config = window.KFD_CONFIG || {};

  /* ——— Navigation ——— */
  function initNav() {
    const nav = document.querySelector('.site-nav');
    const toggle = document.querySelector('.site-nav__toggle');
    const links = document.querySelectorAll('.site-nav__link');
    if (!nav) return;

    toggle?.addEventListener('click', () => {
      nav.classList.toggle('is-open');
      toggle.setAttribute(
        'aria-expanded',
        nav.classList.contains('is-open') ? 'true' : 'false'
      );
    });

    links.forEach((link) => {
      link.addEventListener('click', () => nav.classList.remove('is-open'));
    });

    window.addEventListener(
      'scroll',
      () => nav.classList.toggle('is-scrolled', window.scrollY > 40),
      { passive: true }
    );

    const sections = [...document.querySelectorAll('main section[id]')];
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => {
            link.classList.toggle(
              'is-active',
              link.getAttribute('href') === '#' + entry.target.id
            );
          });
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
  }

  /* ——— Countdown ——— */
  function initCountdown() {
    const root = document.getElementById('countdown');
    if (!root || !config.eventDate) return;

    const target = new Date(config.eventDate).getTime();
    const parts = {
      days: root.querySelector('[data-unit="days"]'),
      hours: root.querySelector('[data-unit="hours"]'),
      minutes: root.querySelector('[data-unit="minutes"]'),
      seconds: root.querySelector('[data-unit="seconds"]'),
    };

    function tick() {
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (parts.days) parts.days.textContent = String(d).padStart(2, '0');
      if (parts.hours) parts.hours.textContent = String(h).padStart(2, '0');
      if (parts.minutes) parts.minutes.textContent = String(m).padStart(2, '0');
      if (parts.seconds) parts.seconds.textContent = String(s).padStart(2, '0');

      if (diff === 0) {
        root.classList.add('is-live');
        const label = root.querySelector('.countdown__label');
        if (label) label.textContent = "It's showtime!";
      }
    }

    tick();
    setInterval(tick, 1000);
  }

  /* ——— Hero parallax ——— */
  function initHeroMotion() {
    const hero = document.querySelector('.hero');
    const glow = document.querySelector('.hero__glow');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    hero.addEventListener(
      'mousemove',
      (e) => {
        const rect = hero.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        if (glow) {
          glow.style.transform = `translate(${x * 24}px, ${y * 16}px)`;
        }
        const content = hero.querySelector('.hero__content');
        if (content) {
          content.style.transform = `translate(${x * 8}px, ${y * 6}px)`;
        }
      },
      { passive: true }
    );
  }

  /* ——— Scroll reveal ——— */
  let revealObserver;

  function initReveal() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
  }

  function initLineup() {
    window.KFD_mountLineup?.();
  }

  /* ——— Lightbox ——— */
  let lightboxApi = null;

  function initLightbox() {
    const root = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    if (!root || !img) return;

    const state = { slides: [], index: 0 };

    function syncNav() {
      const multi = state.slides.length > 1;
      if (prevBtn) prevBtn.hidden = !multi;
      if (nextBtn) nextBtn.hidden = !multi;
    }

    function showSlide() {
      const slide = state.slides[state.index];
      if (!slide) return;
      if (typeof slide === 'string') {
        img.src = slide;
        img.alt = '';
      } else {
        img.src = slide.src;
        img.alt = slide.alt || '';
      }
    }

    function open(slides, index = 0) {
      state.slides = slides;
      state.index = index;
      showSlide();
      syncNav();
      root.hidden = false;
      document.body.classList.add('lightbox-open');
    }

    function close() {
      root.hidden = true;
      document.body.classList.remove('lightbox-open');
    }

    function step(dir) {
      if (state.slides.length <= 1) return;
      state.index = (state.index + dir + state.slides.length) % state.slides.length;
      showSlide();
    }

    closeBtn?.addEventListener('click', close);
    root.addEventListener('click', (e) => {
      if (e.target === root) close();
    });
    prevBtn?.addEventListener('click', () => step(-1));
    nextBtn?.addEventListener('click', () => step(1));
    document.addEventListener('keydown', (e) => {
      if (root.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });

    lightboxApi = { open, close };
  }

  function initPoster() {
    const btn = document.getElementById('poster-enlarge');
    const posterImg = btn?.querySelector('img');
    if (!btn || !posterImg || !lightboxApi) return;

    btn.addEventListener('click', () => {
      lightboxApi.open(
        [{ src: posterImg.currentSrc || posterImg.src, alt: posterImg.alt }],
        0
      );
    });
  }

  /* ——— Gallery ——— */
  function initGallery() {
    const grid = document.getElementById('gallery-grid');
    const photos = window.KFD_GALLERY || [];
    if (!grid || !photos.length) return;

    const initial = 8;
    let shown = initial;

    function render() {
      const slice = photos.slice(0, shown);
      grid.innerHTML = slice
        .map(
          (src, i) => `
          <button type="button" class="gallery-item reveal" data-index="${i}" aria-label="Open photo ${i + 1}">
            <img src="${src}" alt="Kingston Fun Day photo ${i + 1}" loading="lazy" decoding="async">
          </button>`
        )
        .join('');

      grid.querySelectorAll('.gallery-item').forEach((btn) => {
        btn.addEventListener('click', () => {
          lightboxApi?.open(photos, Number(btn.dataset.index));
        });
      });

      document.querySelectorAll('#gallery-grid .reveal').forEach((el) => {
        revealObserver?.observe(el);
      });
    }

    const loadMoreBtn = document.getElementById('gallery-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.hidden = photos.length <= initial;
      loadMoreBtn.addEventListener('click', () => {
        shown = photos.length;
        render();
        loadMoreBtn.hidden = true;
      });
    }

    render();
  }

  /* ——— Map ——— */
  function initMap() {
    const el = document.getElementById('map');
    const mapConfig = config.map;
    if (!el || !mapConfig || typeof L === 'undefined') return;

    const map = L.map(el, {
      scrollWheelZoom: false,
      attributionControl: false,
      tap: true,
    }).setView([mapConfig.lat, mapConfig.lng], mapConfig.zoom || 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
      maxZoom: 18,
    }).addTo(map);

    const marker = L.marker([mapConfig.lat, mapConfig.lng]).addTo(map);
    marker.bindPopup(
      `<strong>${mapConfig.label}</strong><br>${mapConfig.address || ''}<br><a href="${mapConfig.w3wUrl || 'https://what3words.com/hedge.tidal.admits'}" target="_blank" rel="noopener">///${mapConfig.what3words || 'hedge.tidal.admits'}</a>`
    ).openPopup();

    el.addEventListener('click', () => map.scrollWheelZoom.enable(), { once: true });

    const directionsPostcode = document.getElementById('map-directions-postcode');
    if (directionsPostcode) {
      directionsPostcode.href =
        mapConfig.directionsPostcodeUrl ||
        'https://www.google.com/maps/dir/?api=1&destination=TQ7+4QD';
    }

    const directionsW3w = document.getElementById('map-directions-w3w');
    if (directionsW3w && mapConfig.w3wUrl) {
      directionsW3w.href = mapConfig.w3wUrl;
    }

    const directions = document.getElementById('map-directions');
    if (directions && mapConfig.directionsUrl) {
      directions.href = mapConfig.directionsUrl;
    }
  }

  function init() {
    initNav();
    initCountdown();
    initHeroMotion();
    initReveal();
    initLightbox();
    initPoster();
    initGallery();
    initMap();
    initLineup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
