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
    if (count <= 1) return 0.78;
    if (count <= 2) return 0.68;
    if (count <= 4) return 0.54;
    return 0.44;
  }

  const TENT_POSITIONS = {
    1: [[40, 38]],
    2: [[31, 36], [49, 36]],
    3: [[26, 34], [40, 38], [54, 34]],
    4: [[24, 32], [34, 36], [46, 36], [56, 32]],
    5: [[22, 31], [31, 35], [40, 39], [49, 35], [58, 31]],
    6: [[21, 30], [29, 34], [37, 38], [45, 38], [53, 34], [59, 30]],
  };

  const VAN_POSITIONS = {
    1: [[36, 22]],
    2: [[27, 22], [45, 22]],
    3: [[23, 21], [36, 23], [49, 21]],
    4: [[21, 20], [30, 23], [42, 23], [51, 20]],
    5: [[19, 19], [27, 22], [36, 24], [45, 22], [53, 19]],
    6: [[19, 19], [26, 21], [33, 24], [39, 24], [46, 21], [53, 19]],
  };

  function positionsFor(count, map) {
    if (map[count]) return map[count];
    return map[6].slice(0, count);
  }

  function adultSvg(x, y, crowdScale) {
    const s = crowdScale;
    const sw = 1.25;
    return (
      `<g class="pitch-person pitch-person--adult" transform="translate(${x} ${y}) scale(${s.toFixed(2)})">` +
      `<circle cx="0" cy="-6" r="3" fill="none" stroke="${STROKE}" stroke-width="${sw}"/>` +
      `<line x1="0" y1="-3" x2="0" y2="7" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="-0.5" x2="-3.8" y2="5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="-0.5" x2="3.8" y2="5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="7" x2="-2.6" y2="11.5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="7" x2="2.6" y2="11.5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      '</g>'
    );
  }

  function childSvg(x, y, crowdScale) {
    const s = crowdScale * 0.38;
    const sw = 1.05;
    return (
      `<g class="pitch-person pitch-person--child" transform="translate(${x} ${y}) scale(${s.toFixed(2)})">` +
      `<circle cx="0" cy="-5" r="2.4" fill="none" stroke="${STROKE}" stroke-width="${sw}"/>` +
      `<line x1="0" y1="-2.6" x2="0" y2="6" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="0" x2="-3.2" y2="4.5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="0" x2="3.2" y2="4.5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="6" x2="-2" y2="9.5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      `<line x1="0" y1="6" x2="2" y2="9.5" stroke="${STROKE}" stroke-width="${sw}" stroke-linecap="round"/>` +
      '</g>'
    );
  }

  function personSvg(type, x, y, crowdScale) {
    return type === 'child' ? childSvg(x, y, crowdScale) : adultSvg(x, y, crowdScale);
  }

  function layoutPeople(adults, children, positionMap) {
    const slots = [];
    for (let i = 0; i < adults; i++) slots.push('adult');
    for (let i = 0; i < children; i++) slots.push('child');
    if (!slots.length) return '';

    const count = slots.length;
    const scale = personScale(count);
    const coords = positionsFor(count, positionMap);

    return slots
      .map((type, i) => {
        const [x, y] = coords[i] || coords[coords.length - 1];
        return personSvg(type, x, y, scale);
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
    const glowId = `tent-glow-${uid}`;
    const people = layoutPeople(adults, children, TENT_POSITIONS);
    const label = total > 1 ? `Pitch ${index + 1}` : '';

    return (
      `<figure class="pitch-unit pitch-unit--tent" aria-label="${label || 'Tent pitch'}">` +
      (label ? `<figcaption class="pitch-unit__label">${label}</figcaption>` : '') +
      `<svg class="pitch-unit__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 84 62" aria-hidden="true">` +
      `<defs>` +
      `<clipPath id="${clipId}"><polygon points="42,16 66,48 18,48"/></clipPath>` +
      `<filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">` +
      `<feDropShadow dx="0" dy="0" stdDeviation="1.2" flood-color="#ff8c42" flood-opacity="0.65"/>` +
      `</filter></defs>` +
      `<polygon points="42,14 68,48 16,48" fill="rgba(255,140,66,0.08)"/>` +
      `<polygon class="pitch-unit__shell pitch-unit__glow" filter="url(#${glowId})" points="42,12 70,48 14,48" fill="none" stroke="${STROKE}" stroke-width="1.8" stroke-linejoin="round"/>` +
      `<line x1="42" y1="12" x2="42" y2="48" stroke="${STROKE}" stroke-width="1" opacity="0.3"/>` +
      `<path d="M34 48 Q42 42 50 48" fill="none" stroke="${STROKE}" stroke-width="1.1" opacity="0.55"/>` +
      `<line x1="14" y1="48" x2="70" y2="48" stroke="${STROKE}" stroke-width="1.3" opacity="0.5"/>` +
      `<line x1="16" y1="48" x2="14" y2="52" stroke="${STROKE}" stroke-width="1" opacity="0.45"/>` +
      `<line x1="68" y1="48" x2="70" y2="52" stroke="${STROKE}" stroke-width="1" opacity="0.45"/>` +
      `<line x1="42" y1="48" x2="42" y2="52" stroke="${STROKE}" stroke-width="0.9" opacity="0.35"/>` +
      `<g clip-path="url(#${clipId})">${people}</g>` +
      '</svg></figure>'
    );
  }

  function vanUnit(adults, children, index, total) {
    const uid = ++unitUid;
    const clipId = `van-clip-${uid}`;
    const glowId = `van-glow-${uid}`;
    const people = layoutPeople(adults, children, VAN_POSITIONS);
    const label = total > 1 ? `Pitch ${index + 1}` : '';

    return (
      `<figure class="pitch-unit pitch-unit--van" aria-label="${label || 'Campervan pitch'}">` +
      (label ? `<figcaption class="pitch-unit__label">${label}</figcaption>` : '') +
      `<svg class="pitch-unit__svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 54" aria-hidden="true">` +
      `<defs>` +
      `<clipPath id="${clipId}"><rect x="15" y="15" width="50" height="17" rx="2"/></clipPath>` +
      `<filter id="${glowId}" x="-15%" y="-15%" width="130%" height="130%">` +
      `<feDropShadow dx="0" dy="0" stdDeviation="1.1" flood-color="#ff8c42" flood-opacity="0.6"/>` +
      `</filter></defs>` +
      `<rect x="10" y="13" width="56" height="22" rx="3.5" fill="rgba(255,140,66,0.08)"/>` +
      `<rect class="pitch-unit__shell pitch-unit__glow" filter="url(#${glowId})" x="8" y="12" width="58" height="24" rx="3.5" fill="none" stroke="${STROKE}" stroke-width="1.8"/>` +
      `<path d="M66 14 h14 v20 h-14 z" fill="rgba(255,140,66,0.06)" stroke="${STROKE}" stroke-width="1.4"/>` +
      `<path d="M69 16 L81 23 L81 31 L69 31 Z" fill="none" stroke="${STROKE}" stroke-width="1" opacity="0.6"/>` +
      `<line x1="75" y1="19" x2="75" y2="30" stroke="${STROKE}" stroke-width="0.8" opacity="0.35"/>` +
      `<rect x="18" y="18" width="8" height="6" rx="1" fill="none" stroke="${STROKE}" stroke-width="0.8" opacity="0.35"/>` +
      `<rect x="28" y="18" width="8" height="6" rx="1" fill="none" stroke="${STROKE}" stroke-width="0.8" opacity="0.35"/>` +
      `<line x1="18" y1="26" x2="58" y2="26" stroke="${STROKE}" stroke-width="0.7" opacity="0.25"/>` +
      `<circle cx="24" cy="39" r="3.8" fill="none" stroke="${STROKE}" stroke-width="1.2"/>` +
      `<circle cx="56" cy="39" r="3.8" fill="none" stroke="${STROKE}" stroke-width="1.2"/>` +
      `<circle cx="24" cy="39" r="1.2" fill="none" stroke="${STROKE}" stroke-width="0.7" opacity="0.5"/>` +
      `<circle cx="56" cy="39" r="1.2" fill="none" stroke="${STROKE}" stroke-width="0.7" opacity="0.5"/>` +
      `<line x1="8" y1="37" x2="82" y2="37" stroke="${STROKE}" stroke-width="0.9" opacity="0.25"/>` +
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
