(function () {
  'use strict';

  const STORAGE_KEY = 'kfd-theme';
  const CEEFAX_UNLOCK_KEY = 'kfd-ceefax-unlocked';
  const WIND_KEY = 'kfd-wind';
  const RAIN_KEY = 'kfd-rain';
  const BALLOON_KEY = 'kfd-balloons';
  const BALLOON_HUES = [330, 200, 45, 280, 160, 15, 350, 120];

  const root = document.documentElement;
  const balloonLayers = {
    back: document.getElementById('balloon-layer-back'),
    mid: document.getElementById('balloon-layer-mid'),
    front: document.getElementById('balloon-layer-front'),
  };
  const balloonRoots = {
    back: document.getElementById('sky-balloons-back'),
    mid: document.getElementById('sky-balloons-mid'),
    front: document.getElementById('sky-balloons-front'),
  };
  const rainCanvas = document.getElementById('rain-canvas');
  const themeToggle = document.getElementById('theme-toggle');
  const balloonToggle = document.getElementById('balloon-toggle');
  const panelToggle = document.getElementById('weather-panel-toggle');
  const weatherPanel = document.getElementById('weather-panel');
  const windSlider = document.getElementById('wind-speed');
  const rainToggle = document.getElementById('rain-toggle');
  const ceefaxBar = document.getElementById('ceefax-bar');

  let windFactor = 1;
  let rainActive = false;
  let rainAnimId = null;
  let raindrops = [];
  let balloonsEnabled = false;
  let rainController = null;
  let popCount = 0;

  const STRING_SVG =
    '<svg class="balloon__string" viewBox="0 0 24 100" aria-hidden="true">' +
    '<path class="balloon__string-path" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">' +
    '<animate attributeName="d" dur="2.4s" repeatCount="indefinite" ' +
    'values="M12 0 C16 28 8 52 13 78 S12 100 12 100;' +
    'M12 0 C8 26 18 50 9 79 S14 98 12 100;' +
    'M12 0 C18 30 6 54 15 76 S10 102 12 100;' +
    'M12 0 C14 24 10 56 11 74 S16 96 12 100;' +
    'M12 0 C10 32 16 48 8 80 S14 98 12 100;' +
    'M12 0 C16 28 8 52 13 78 S12 100 12 100"/>' +
    '</path></svg>';

  function isCeefaxUnlocked() {
    return localStorage.getItem(CEEFAX_UNLOCK_KEY) === '1';
  }

  function getTheme() {
    const theme = root.dataset.theme;
    if (theme === 'sky') return 'sky';
    if (theme === 'ceefax') return 'ceefax';
    return 'dark';
  }

  function syncCeefaxBar(theme) {
    if (!ceefaxBar) return;
    const show = theme === 'ceefax';
    ceefaxBar.hidden = !show;
    ceefaxBar.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function allLayers() {
    return Object.values(balloonLayers).filter(Boolean);
  }

  function setTheme(theme) {
    if (theme === 'ceefax' && !isCeefaxUnlocked()) {
      theme = 'dark';
    }

    root.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    updateThemeMeta(theme);
    updateThemeButton(theme);
    syncCeefaxBar(theme);
    syncBalloonLayers();
    syncRainFromToggle();
  }

  function enableCeefax() {
    localStorage.setItem(CEEFAX_UNLOCK_KEY, '1');
    setTheme('ceefax');
  }

  function toggleCeefax() {
    if (!isCeefaxUnlocked()) return;
    setTheme(getTheme() === 'ceefax' ? 'dark' : 'ceefax');
  }

  function syncRainFromToggle() {
    if (rainToggle?.checked) rainController?.start();
    else rainController?.stop();
  }

  function syncBalloonLayers() {
    allLayers().forEach((layer) => {
      layer.classList.toggle('is-active', balloonsEnabled);
      layer.setAttribute('aria-hidden', balloonsEnabled ? 'false' : 'true');
    });
  }

  function updateBalloonToggle() {
    if (!balloonToggle) return;
    balloonToggle.setAttribute('aria-pressed', balloonsEnabled ? 'true' : 'false');
    balloonToggle.classList.toggle('is-active', balloonsEnabled);
    updatePopBadge();
  }

  function updatePopBadge() {
    if (!balloonToggle) return;
    let badge = balloonToggle.querySelector('.balloon-pop-count');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'balloon-pop-count';
      balloonToggle.appendChild(badge);
    }
    badge.textContent = String(popCount);
    badge.hidden = popCount === 0;
  }

  function setBalloonsEnabled(enabled) {
    balloonsEnabled = enabled;
    localStorage.setItem(BALLOON_KEY, enabled ? '1' : '0');
    updateBalloonToggle();
    syncBalloonLayers();
    if (enabled) {
      if (!balloonRoots.front?.children.length) populateBalloons();
    } else {
      Object.values(balloonRoots).forEach((rootEl) => {
        if (rootEl) rootEl.innerHTML = '';
      });
    }
  }

  function updateThemeMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (theme === 'sky') meta.content = '#87ceeb';
    else if (theme === 'ceefax') meta.content = '#000084';
    else meta.content = '#0a0a0f';
  }

  function updateThemeButton(theme) {
    if (!themeToggle) return;
    if (theme === 'ceefax') {
      themeToggle.textContent = '📺';
      themeToggle.setAttribute('aria-label', 'Exit Ceefax mode');
      return;
    }
    themeToggle.textContent = theme === 'sky' ? '🌙' : '☀️';
    themeToggle.setAttribute(
      'aria-label',
      theme === 'sky' ? 'Switch to dark theme' : 'Switch to sky theme'
    );
  }

  function setWind(value) {
    const pct = Number(value);
    windFactor = 0.25 + (pct / 100) * 2.25;
    root.style.setProperty('--wind-factor', windFactor.toFixed(2));
    localStorage.setItem(WIND_KEY, String(pct));

    document.querySelectorAll('.cloud').forEach((el, i) => {
      const base = [55, 70, 90][i] || 60;
      el.style.setProperty('--cloud-dur', (base / windFactor).toFixed(1) + 's');
    });

    document.querySelectorAll('.balloon').forEach((el) => {
      const baseRise = parseFloat(el.dataset.baseRise || '28');
      const baseSway = parseFloat(el.dataset.baseSway || '3');
      const baseString = parseFloat(el.dataset.baseString || '2.4');
      const windBoost = 1 + windFactor * 0.85;
      el.style.setProperty('--rise-dur', (baseRise / (windFactor * windBoost)).toFixed(1) + 's');
      el.style.setProperty('--sway-dur', (baseSway / (windFactor * 0.9)).toFixed(2) + 's');
      el.style.setProperty('--string-dur', (baseString / (windFactor * 0.75)).toFixed(2) + 's');
      el.style.setProperty('--swing', (3 + windFactor * 5).toFixed(1) + 'deg');
      el.style.setProperty('--drift', (60 + windFactor * 160).toFixed(0) + 'px');

      const pathAnim = el.querySelector('.balloon__string-path animate');
      if (pathAnim) {
        pathAnim.setAttribute('dur', (baseString / (windFactor * 0.75)).toFixed(2) + 's');
      }
    });
  }

  function balloonMarkup(layer) {
    const size =
      layer === 'back'
        ? 22 + Math.random() * 14
        : layer === 'mid'
          ? 28 + Math.random() * 14
          : 32 + Math.random() * 16;
    const baseRise =
      layer === 'back'
        ? 42 + Math.random() * 58
        : layer === 'mid'
          ? 24 + Math.random() * 32
          : 10 + Math.random() * 18;
    const baseSway = 1.8 + Math.random() * 2.8;
    const baseString = 1.6 + Math.random() * 2.6;
    const hue = BALLOON_HUES[Math.floor(Math.random() * BALLOON_HUES.length)];

    return {
      size,
      baseRise,
      baseSway,
      baseString,
      hue,
      left: 4 + Math.random() * 92,
      delay: (-Math.random() * baseRise).toFixed(1),
    };
  }

  function buildBalloon(layer) {
    const spec = balloonMarkup(layer);
    const el = document.createElement(layer === 'front' ? 'button' : 'div');
    if (layer === 'front') {
      el.type = 'button';
      el.setAttribute('aria-label', 'Pop balloon');
    } else {
      el.setAttribute('aria-hidden', 'true');
    }

    el.className = 'balloon balloon--' + layer;
    el.style.left = spec.left + '%';
    el.style.setProperty('--balloon-size', spec.size.toFixed(0) + 'px');
    el.style.setProperty('--balloon-hue', spec.hue);
    el.style.setProperty('--rise-delay', spec.delay + 's');
    el.dataset.baseRise = spec.baseRise.toFixed(1);
    el.dataset.baseSway = spec.baseSway.toFixed(2);
    el.dataset.baseString = spec.baseString.toFixed(2);
    el.style.setProperty('--string-dur', spec.baseString.toFixed(2) + 's');

    el.innerHTML =
      '<span class="balloon__float">' +
      '<span class="balloon__sway">' +
      '<span class="balloon__body"></span>' +
      '<span class="balloon__knot"></span>' +
      '<span class="balloon__string-wrap">' +
      STRING_SVG +
      '</span></span></span>';

    if (layer === 'front') {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        popBalloon(el);
      });
    }

    return el;
  }

  function popBalloon(el) {
    if (!el || el.classList.contains('is-popping')) return;

    const float = el.querySelector('.balloon__float');
    if (float) float.style.animationPlayState = 'paused';

    const target = el.querySelector('.balloon__body') || el;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hue = getComputedStyle(el).getPropertyValue('--balloon-hue').trim() || '330';
    const size = getComputedStyle(el).getPropertyValue('--balloon-size').trim() || '36px';

    const fx = document.createElement('div');
    fx.className = 'balloon-pop-fx';
    fx.style.left = cx + 'px';
    fx.style.top = cy + 'px';
    fx.style.setProperty('--balloon-hue', hue);
    fx.style.setProperty('--balloon-size', size);

    fx.innerHTML =
      '<span class="balloon-pop-fx__flash"></span>' +
      '<span class="balloon-pop-fx__ring"></span>' +
      '<span class="balloon-pop-fx__ring balloon-pop-fx__ring--delay"></span>';

    for (let i = 0; i < 10; i++) {
      const bit = document.createElement('span');
      bit.className = 'balloon-pop-fx__bit';
      bit.style.setProperty('--bit-angle', (i * 36 + Math.random() * 18).toFixed(0) + 'deg');
      bit.style.setProperty('--bit-dist', (24 + Math.random() * 40).toFixed(0) + 'px');
      fx.appendChild(bit);
    }

    document.body.appendChild(fx);

    el.classList.add('is-popping');
    if (el.disabled !== undefined) el.disabled = true;

    popCount += 1;
    updatePopBadge();

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      fx.remove();
      el.remove();
      if (balloonsEnabled && balloonRoots.front) {
        balloonRoots.front.appendChild(buildBalloon('front'));
        setWind(windSlider?.value ?? 40);
      }
    };

    fx.addEventListener('animationend', cleanup, { once: true });
    window.setTimeout(cleanup, 680);
  }

  function populateBalloons() {
    const counts = window.matchMedia('(max-width: 640px)').matches
      ? { back: 4, mid: 3, front: 3 }
      : { back: 6, mid: 5, front: 4 };

    Object.entries(counts).forEach(([layer, count]) => {
      const rootEl = balloonRoots[layer];
      if (!rootEl) return;
      rootEl.innerHTML = '';
      for (let i = 0; i < count; i++) {
        rootEl.appendChild(buildBalloon(layer));
      }
    });

    setWind(windSlider?.value ?? 40);
  }

  function initRain() {
    if (!rainCanvas) return;
    const ctx = rainCanvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      rainCanvas.width = window.innerWidth;
      rainCanvas.height = window.innerHeight;
      const density = window.innerWidth < 640 ? 80 : 140;
      raindrops = Array.from({ length: density }, () => ({
        x: Math.random() * rainCanvas.width,
        y: Math.random() * rainCanvas.height,
        len: 8 + Math.random() * 14,
        speed: 4 + Math.random() * 6,
      }));
    }

    function draw() {
      if (!rainActive) {
        ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
        rainAnimId = null;
        return;
      }

      ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
      ctx.strokeStyle =
        getTheme() === 'sky' ? 'rgba(70, 120, 170, 0.75)' : 'rgba(180, 210, 255, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';

      const vx = windFactor * 2.5;

      raindrops.forEach((drop) => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + vx, drop.y + drop.len);
        ctx.stroke();

        drop.y += drop.speed * windFactor;
        drop.x += vx * 0.3;

        if (drop.y > rainCanvas.height) {
          drop.y = -drop.len;
          drop.x = Math.random() * rainCanvas.width;
        }
        if (drop.x > rainCanvas.width) drop.x = 0;
      });

      rainAnimId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    return {
      start() {
        rainActive = true;
        rainCanvas.classList.add('is-active');
        if (!rainAnimId) draw();
      },
      stop() {
        rainActive = false;
        rainCanvas.classList.remove('is-active');
        if (rainAnimId) {
          cancelAnimationFrame(rainAnimId);
          rainAnimId = null;
        }
        ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
      },
    };
  }

  function initControls() {
    themeToggle?.addEventListener('click', () => {
      const current = getTheme();
      if (current === 'ceefax') {
        setTheme('dark');
        return;
      }
      setTheme(current === 'sky' ? 'dark' : 'sky');
    });

    balloonToggle?.addEventListener('click', () => {
      setBalloonsEnabled(!balloonsEnabled);
    });

    panelToggle?.addEventListener('click', () => {
      if (!weatherPanel) return;
      const open = weatherPanel.hidden;
      weatherPanel.hidden = !open;
      panelToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    windSlider?.addEventListener('input', (e) => setWind(e.target.value));

    rainToggle?.addEventListener('change', (e) => {
      localStorage.setItem(RAIN_KEY, e.target.checked ? '1' : '0');
      syncRainFromToggle();
    });

    window.matchMedia('(max-width: 640px)').addEventListener('change', () => {
      if (balloonsEnabled) populateBalloons();
    });
  }

  function init() {
    let savedTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
    if (savedTheme === 'ceefax' && !isCeefaxUnlocked()) {
      savedTheme = 'dark';
    }

    const savedWind = localStorage.getItem(WIND_KEY);
    const savedRain = localStorage.getItem(RAIN_KEY) === '1';
    const savedBalloons = localStorage.getItem(BALLOON_KEY);
    balloonsEnabled = savedBalloons === '1';

    root.dataset.theme = savedTheme;
    updateThemeMeta(savedTheme);
    updateThemeButton(savedTheme);
    syncCeefaxBar(savedTheme);
    updateBalloonToggle();

    if (windSlider && savedWind !== null) windSlider.value = savedWind;
    if (rainToggle) rainToggle.checked = savedRain;

    rainController = initRain();
    initControls();
    syncBalloonLayers();

    if (balloonsEnabled) populateBalloons();

    syncRainFromToggle();

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) rainController?.stop();
    });
  }

  window.KFD_THEME = {
    enableCeefax,
    toggleCeefax,
    isCeefaxUnlocked,
    isCeefaxActive: () => getTheme() === 'ceefax',
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
