/** Lineup data — update links any time in this one file. */
window.KFD_BANDS = [
  {
    id: 'horce-divorse',
    name: 'Horce Divorse',
    style: 'Punk / Rock · Devon',
    featured: true,
    accent: '#39ff14',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/horcedivorseuk' },
      { label: 'Website', url: 'https://www.horcedivorse.com/' },
      { label: 'Spotify', url: 'https://open.spotify.com/artist/5iDawukTsOGn3RGwLouU5m' },
      { label: 'Bandcamp', url: 'https://horcedivorse.bandcamp.com/' },
    ],
  },
  {
    id: '500-hojus',
    name: '500 Hojas',
    style: 'Live music',
    accent: '#ffffff',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/vickypark1989' },
      {
        label: 'Spotify',
        url: 'https://open.spotify.com/artist/6uWF9aw0Kow25H6lFzMIgb?si=MPmGZjLPR_eomKKbjOk3GQ',
      },
    ],
  },
  {
    id: 'all-for-jolly-duo',
    name: 'All For Jolly Duo',
    style: 'Cornish folk punk',
    accent: '#ffffff',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/allforjolly' },
      { label: 'Website', url: 'https://allforjolly.com/' },
    ],
  },
  {
    id: 'vardo-manor',
    name: 'Vardo Manor',
    style: 'Funk · rock · reggae',
    accent: '#ffb347',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61562694460144' },
    ],
  },
  {
    id: 'empire-blind',
    name: 'Empire Blind',
    style: 'Rock · Plymouth',
    accent: '#ff4d4d',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61564948893456' },
      { label: 'Bandcamp', url: 'https://empireblind.bandcamp.com/' },
    ],
  },
  {
    id: 'phoenix-proposal',
    name: 'The Phoenix Proposal',
    style: 'Blues · rock · soul',
    accent: '#4dd0ff',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61571738420065' },
    ],
  },
  {
    id: 'iris',
    name: 'IRIS',
    style: 'Live music',
    accent: '#ff2d8a',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=100072315998797' },
    ],
  },
  {
    id: 'fret-level-midnight',
    name: 'Fret Level Midnight',
    style: 'Live music',
    accent: '#ffffff',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61575780505547' },
    ],
  },
  {
    id: 'yeoland',
    name: 'Yeoland',
    style: 'Folk duo · South Dartmoor',
    accent: '#ffffff',
    links: [
      { label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61584920023296' },
    ],
  },
  {
    id: 'greg-shepherd',
    name: 'Greg Shepherd',
    style: 'Live music · Devon',
    accent: '#ff8c42',
    links: [],
  },
];

(function () {
  'use strict';

  function isLightAccent(hex) {
    if (!hex || hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff') return true;
    const raw = hex.replace('#', '');
    if (raw.length !== 6) return false;
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 180;
  }

  function bandAccentVars(accent) {
    const readable = isLightAccent(accent) ? '#1e3a5f' : accent;
    return `--band-accent: ${accent}; --band-accent-readable: ${readable}`;
  }

  function mountLineup() {
    const grid = document.getElementById('lineup-grid');
    const bands = window.KFD_BANDS;
    if (!grid || !bands || !bands.length || grid.dataset.mounted === '1') return;

    grid.dataset.mounted = '1';
    grid.innerHTML = bands
      .map((band) => {
        const hasLinks = band.links && band.links.length > 0;
        const linksHtml = hasLinks
          ? band.links
              .map(
                (l) =>
                  `<a class="band-card__link" href="${l.url.trim()}" target="_blank" rel="noopener">${l.label}</a>`
              )
              .join('')
          : '<p class="band-card__soon">Links coming soon — catch them live at KFD!</p>';

        return (
          `<article class="band-card${band.featured ? ' band-card--featured' : ''}"` +
          ` style="${bandAccentVars(band.accent)}" tabindex="0" role="button"` +
          ` aria-expanded="false" data-band="${band.id}">` +
          `<div class="band-card__inner">` +
          `<div class="band-card__front">` +
          `<h3 class="band-card__name">${band.name}</h3>` +
          `<p class="band-card__style">${band.style}</p>` +
          `<span class="band-card__tap">${hasLinks ? 'Tap for links' : 'Tap for info'}</span>` +
          `</div><div class="band-card__back">${linksHtml}</div></div></article>`
        );
      })
      .join('');

    grid.querySelectorAll('.band-card').forEach((card) => {
      function toggle() {
        const open = card.classList.toggle('is-open');
        card.setAttribute('aria-expanded', open ? 'true' : 'false');
        grid.querySelectorAll('.band-card.is-open').forEach((other) => {
          if (other !== card) {
            other.classList.remove('is-open');
            other.setAttribute('aria-expanded', 'false');
          }
        });
      }

      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        toggle();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  window.KFD_mountLineup = mountLineup;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLineup);
  } else {
    mountLineup();
  }
})();
