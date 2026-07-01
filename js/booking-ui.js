(function () {
  'use strict';

  const rates =
    typeof RATES !== 'undefined'
      ? RATES
      : window.KFD_RATES || { maxPeoplePerPitch: 6, maxDogs: 6, pitchPerNight: 15 };

  const form = document.getElementById('booking-form');
  const dashboard = document.getElementById('pitch-dashboard');
  if (!form || !dashboard) return;

  let unitUid = 0;
  const STROKE = '#ff8c42';

  const state = {
    accommodation: 'tent',
    nights: 2,
    adults: 1,
    children: 0,
    dogs: 0,
  };

  const els = {
    units: document.getElementById('pitch-units'),
    dogsOutside: document.getElementById('pitch-dogs-outside'),
    tentBtn: dashboard.querySelector('[data-type="tent"]'),
    vanBtn: dashboard.querySelector('[data-type="campervan"]'),
    nightsSelect: document.getElementById('nights-select'),
    adultsSlider: document.getElementById('adults-slider'),
    childrenSlider: document.getElementById('children-slider'),
    adultsOut: document.getElementById('adults-out'),
    childrenOut: document.getElementById('children-out'),
    dogsInput: document.getElementById('dogs-input'),
    hiddenNights: document.getElementById('nights'),
    hiddenAdults: document.getElementById('adults'),
    hiddenChildren: document.getElementById('children'),
    radioTent: form.querySelector('input[name="accommodation"][value="tent"]'),
    radioVan: form.querySelector('input[name="accommodation"][value="campervan"]'),
  };

  function splitEvenly(total, parts) {
    const counts = Array(parts).fill(0);
    for (let i = 0; i < total; i++) counts[i % parts] += 1;
    return counts;
  }

  function pitchCount() {
    const people = state.adults + state.children;
    return Math.max(1, Math.ceil(people / rates.maxPeoplePerPitch));
  }

  function personScale(count) {
    if (count <= 1) return 0.88;
    if (count <= 2) return 0.78;
    if (count <= 4) return 0.64;
    return 0.52;
  }

  function personSvg(type, x, y, scale) {
    const s = scale * (type === 'child' ? 0.88 : 1);
    const sw = 1.2;
    return (
      `<g class="pitch-person pitch-person--${type}" transform="translate(${x} ${y}) scale(${s.toFixed(2)})">` +
      `<circle cx="0" cy="-4" r="2.2" fill="none" stroke="${STROKE}" stroke-width="${sw}"/>` +
      `<line x1="0" y1="-1.8" x2="0" y2="5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="0.5" x2="-2.8" y2="4" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="0.5" x2="2.8" y2="4" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      '</g>'
    );
  }

  function layoutPeople(adults, children, bounds) {
    const slots = [];
    for (let i = 0; i < adults; i++) slots.push('adult');
    for (let i = 0; i < children; i++) slots.push('child');
    if (!slots.length) return '';

    const count = slots.length;
    const scale = personScale(count);
    const cols = count <= 3 ? count : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const padX = bounds.width * 0.12;
    const padY = bounds.height * 0.1;
    const cellW = (bounds.width - padX * 2) / cols;
    const cellH = (bounds.height - padY * 2) / rows;

    return slots
      .map((type, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = bounds.x + padX + cellW * col + cellW / 2;
        const y = bounds.y + padY + cellH * row + cellH * 0.62;
        return personSvg(type, x.toFixed(1), y.toFixed(1), scale);
      })
      .join('');
  }

  function dogSvg(size) {
    const h = Math.round(size * 0.78);
    return (
      `<svg class="pitch-dog-neon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 28" width="${size}" height="${h}" aria-hidden="true">` +
      `<ellipse cx="18" cy="17" rx="9" ry="6" fill="none" stroke="${STROKE}" stroke-width="1.4"/>` +
      `<circle cx="26" cy="11" r="5" fill="none" stroke="${STROKE}" stroke-width="1.4"/>` +
      `<path d="M10 16 Q4 14 3 8" fill="none" stroke="${STROKE}" stroke-width="1.3"/>` +
      `<line x1="14" y1="22" x2="12" y2="26" stroke="${STROKE}" stroke-width="1.2" stroke-linecap="round"/>` +
      `<line x1="18" y1="23" x2="18" y2="27" stroke="${STROKE}" stroke-width="1.2" stroke-linecap="round"/>` +
      `<line x1="22" y1="22" x2="24" y2="26" stroke="${STROKE}" stroke-width="1.2" stroke-linecap="round"/>` +
      `<circle cx="24" cy="10" r="0.8" fill="none" stroke="${STROKE}" stroke-width="1"/>` +
      '</svg>'
    );
  }

  function tentUnit(adults, children, index, total) {
    const uid = ++unitUid;
    const clipId = `tent-clip-${uid}`;
    const people = layoutPeople(adults, children, { x: 12, y: 22, width: 56, height: 24 });
    const label = total > 1 ? `Pitch ${index + 1}` : '';

    return (
      `<figure class="pitch-unit pitch-unit--tent" aria-label="${label || 'Tent pitch'}">` +
      (label ? `<figcaption class="pitch-unit__label">${label}</figcaption>` : '') +
      `<svg class="pitch-unit__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 62" aria-hidden="true">` +
      `<defs><clipPath id="${clipId}"><polygon points="40,12 70,50 10,50"/></clipPath></defs>` +
      `<polygon class="pitch-unit__shell" points="40,10 72,50 8,50" fill="none" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<line x1="40" y1="10" x2="40" y2="50" stroke="${STROKE}" stroke-width="1" opacity="0.45"/>` +
      `<g clip-path="url(#${clipId})">${people}</g>` +
      '</svg></figure>'
    );
  }

  function vanUnit(adults, children, index, total) {
    const uid = ++unitUid;
    const clipId = `van-clip-${uid}`;
    const people = layoutPeople(adults, children, { x: 12, y: 14, width: 52, height: 16 });
    const label = total > 1 ? `Pitch ${index + 1}` : '';

    return (
      `<figure class="pitch-unit pitch-unit--van" aria-label="${label || 'Campervan pitch'}">` +
      (label ? `<figcaption class="pitch-unit__label">${label}</figcaption>` : '') +
      `<svg class="pitch-unit__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 50" aria-hidden="true">` +
      `<defs><clipPath id="${clipId}"><rect x="12" y="14" width="52" height="18" rx="2"/></clipPath></defs>` +
      `<rect class="pitch-unit__shell" x="8" y="12" width="58" height="22" rx="3" fill="none" stroke="${STROKE}" stroke-width="1.6"/>` +
      `<path d="M66 14 h10 v18 h-10 z" fill="none" stroke="${STROKE}" stroke-width="1.4"/>` +
      `<line x1="72" y1="18" x2="72" y2="28" stroke="${STROKE}" stroke-width="1" opacity="0.45"/>` +
      `<circle cx="22" cy="36" r="3.5" fill="none" stroke="${STROKE}" stroke-width="1.2"/>` +
      `<circle cx="54" cy="36" r="3.5" fill="none" stroke="${STROKE}" stroke-width="1.2"/>` +
      `<g clip-path="url(#${clipId})">${people}</g>` +
      '</svg></figure>'
    );
  }

  function renderUnits() {
    if (!els.units) return;
    unitUid = 0;
    const count = pitchCount();
    const adultSplit = splitEvenly(state.adults, count);
    const childSplit = splitEvenly(state.children, count);
    const unitFn = state.accommodation === 'campervan' ? vanUnit : tentUnit;

    els.units.innerHTML = Array.from({ length: count }, (_, i) =>
      unitFn(adultSplit[i], childSplit[i], i, count)
    ).join('');
  }

  function renderDogsOutside() {
    if (!els.dogsOutside) return;
    const n = Math.min(rates.maxDogs, Math.max(0, state.dogs));

    if (n === 0) {
      els.dogsOutside.hidden = true;
      els.dogsOutside.innerHTML = '';
      return;
    }

    els.dogsOutside.hidden = false;
    els.dogsOutside.innerHTML =
      '<div class="pitch-dogs-outside__row">' +
      Array.from({ length: n }, () => dogSvg(30)).join('') +
      '</div>';
  }

  function syncHiddenFields() {
    if (els.hiddenNights) els.hiddenNights.value = String(state.nights);
    if (els.hiddenAdults) els.hiddenAdults.value = String(state.adults);
    if (els.hiddenChildren) els.hiddenChildren.value = String(state.children);
    if (els.dogsInput) els.dogsInput.value = String(state.dogs);
    if (els.radioTent) els.radioTent.checked = state.accommodation === 'tent';
    if (els.radioVan) els.radioVan.checked = state.accommodation === 'campervan';
  }

  function syncControls() {
    if (els.adultsOut) els.adultsOut.textContent = String(state.adults);
    if (els.childrenOut) els.childrenOut.textContent = String(state.children);
    if (els.adultsSlider) els.adultsSlider.value = String(state.adults);
    if (els.childrenSlider) els.childrenSlider.value = String(state.children);
    if (els.nightsSelect) els.nightsSelect.value = String(state.nights);

    els.tentBtn?.classList.toggle('is-active', state.accommodation === 'tent');
    els.vanBtn?.classList.toggle('is-active', state.accommodation === 'campervan');
    els.tentBtn?.setAttribute('aria-pressed', state.accommodation === 'tent' ? 'true' : 'false');
    els.vanBtn?.setAttribute('aria-pressed', state.accommodation === 'campervan' ? 'true' : 'false');

    renderUnits();
    renderDogsOutside();
  }

  function emitChange() {
    syncHiddenFields();
    syncControls();
    form.dispatchEvent(new Event('change', { bubbles: true }));
    form.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setAccommodation(type) {
    state.accommodation = type;
    emitChange();
  }

  els.tentBtn?.addEventListener('click', () => setAccommodation('tent'));
  els.vanBtn?.addEventListener('click', () => setAccommodation('campervan'));

  els.nightsSelect?.addEventListener('change', (e) => {
    state.nights = Number(e.target.value);
    emitChange();
  });

  els.adultsSlider?.addEventListener('input', (e) => {
    state.adults = Math.max(1, Number(e.target.value));
    emitChange();
  });

  els.childrenSlider?.addEventListener('input', (e) => {
    state.children = Math.max(0, Number(e.target.value));
    emitChange();
  });

  els.dogsInput?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    state.dogs = Number.isFinite(val) ? Math.min(rates.maxDogs, Math.max(0, val)) : 0;
    if (String(state.dogs) !== e.target.value) e.target.value = String(state.dogs);
    emitChange();
  });

  function init() {
    syncHiddenFields();
    syncControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
