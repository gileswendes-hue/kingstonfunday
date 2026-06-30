(function () {
  'use strict';

  const STORAGE_KEY = 'kfd-theme';
  const WIND_KEY = 'kfd-wind';
  const RAIN_KEY = 'kfd-rain';
  const BALLOON_KEY = 'kfd-balloons';
  const BALLOON_HUES = [330, 200, 45, 280, 160, 15, 350, 120];

  const root = document.documentElement;
  const balloonLayer = document.getElementById('balloon-layer');
  const balloonRoot = document.getElementById('sky-balloons');
  const rainCanvas = document.getElementById('rain-canvas');
  const themeToggle = document.getElementById('theme-toggle');
  const balloonToggle = document.getElementById('balloon-toggle');
  const panelToggle = document.getElementById('weather-panel-toggle');
  const weatherPanel = document.getElementById('weather-panel');
  const windSlider = document.getElementById('wind-speed');
  const rainToggle = document.getElementById('rain-toggle');

  let windFactor = 1;
  let rainActive = false;
  let rainAnimId = null;
  let raindrops = [];
  let balloonsEnabled = true;
  let rainController = null;

  function getTheme() {
    return root.dataset.theme === 'sky' ? 'sky' : 'dark';
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    updateThemeMeta(theme);
    updateThemeButton(theme);
    syncBalloonLayer();
    syncRainFromToggle();
  }

  function syncRainFromToggle() {
    if (rainToggle?.checked) rainController?.start();
    else rainController?.stop();
  }

  function syncBalloonLayer() {
    if (!balloonLayer) return;
    balloonLayer.classList.toggle('is-active', balloonsEnabled);
    balloonLayer.setAttribute('aria-hidden', balloonsEnabled ? 'false' : 'true');
  }

  function updateBalloonToggle() {
    if (!balloonToggle) return;
    balloonToggle.setAttribute('aria-pressed', balloonsEnabled ? 'true' : 'false');
    balloonToggle.classList.toggle('is-active', balloonsEnabled);
  }

  function setBalloonsEnabled(enabled) {
    balloonsEnabled = enabled;
    localStorage.setItem(BALLOON_KEY, enabled ? '1' : '0');
    updateBalloonToggle();
    syncBalloonLayer();
    if (enabled) {
      if (!balloonRoot?.children.length) populateBalloons();
    } else if (balloonRoot) {
      balloonRoot.innerHTML = '';
    }
  }

  function updateThemeMeta(theme) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'sky' ? '#87ceeb' : '#0a0a0f';
  }

  function updateThemeButton(theme) {
    if (!themeToggle) return;
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
      const windBoost = 1 + windFactor * 0.85;
      el.style.setProperty('--rise-dur', (baseRise / (windFactor * windBoost)).toFixed(1) + 's');
      el.style.setProperty('--sway-dur', (baseSway / (windFactor * 0.9)).toFixed(2) + 's');
      el.style.setProperty('--swing', (10 + windFactor * 18).toFixed(1) + 'deg');
      el.style.setProperty('--drift', (60 + windFactor * 160).toFixed(0) + 'px');
    });
  }

  function buildBalloon() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'balloon';
    const size = 62 + Math.random() * 58;
    const depth = 1 + Math.random() * 0.55;
    const baseRise = 18 + Math.random() * 16;
    const baseSway = 2 + Math.random() * 2.5;

    el.style.left = 4 + Math.random() * 92 + '%';
    el.style.setProperty('--balloon-size', (size * depth).toFixed(0) + 'px');
    el.style.setProperty('--balloon-hue', BALLOON_HUES[Math.floor(Math.random() * BALLOON_HUES.length)]);
    el.style.setProperty('--rise-delay', (-Math.random() * baseRise).toFixed(1) + 's');
    el.style.zIndex = String(Math.round(depth * 100));
    el.dataset.baseRise = baseRise.toFixed(1);
    el.dataset.baseSway = baseSway.toFixed(2);
    el.setAttribute('aria-label', 'Pop balloon');

    el.innerHTML =
      '<span class="balloon__body"></span><span class="balloon__knot"></span><span class="balloon__string"></span>';

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      popBalloon(el);
    });

    return el;
  }

  function popBalloon(el) {
    if (!el || el.classList.contains('is-popping')) return;
    el.classList.add('is-popping');
    el.disabled = true;
    window.setTimeout(() => {
      el.remove();
      if (balloonsEnabled) balloonRoot?.appendChild(buildBalloon());
      setWind(windSlider?.value ?? 40);
    }, 480);
  }

  function populateBalloons() {
    if (!balloonRoot) return;
    const count = window.matchMedia('(max-width: 640px)').matches ? 7 : 12;
    balloonRoot.innerHTML = '';
    for (let i = 0; i < count; i++) {
      balloonRoot.appendChild(buildBalloon());
    }
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
      setTheme(getTheme() === 'sky' ? 'dark' : 'sky');
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
    const savedTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
    const savedWind = localStorage.getItem(WIND_KEY);
    const savedRain = localStorage.getItem(RAIN_KEY) === '1';
    const savedBalloons = localStorage.getItem(BALLOON_KEY);
    balloonsEnabled = savedBalloons !== '0';

    root.dataset.theme = savedTheme;
    updateThemeMeta(savedTheme);
    updateThemeButton(savedTheme);
    updateBalloonToggle();

    if (windSlider && savedWind !== null) windSlider.value = savedWind;
    if (rainToggle) rainToggle.checked = savedRain;

    rainController = initRain();
    initControls();
    syncBalloonLayer();

    if (balloonsEnabled) populateBalloons();

    syncRainFromToggle();

    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) rainController?.stop();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
