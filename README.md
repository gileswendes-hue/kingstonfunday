# KFD 2026 — Camping Booking Page

A free, static camping booking site for [Kingston Fun Day](https://www.instagram.com/kfd_kingstonfunday/). No server required — host on GitHub Pages at zero cost, with PayPal handling payments (card or PayPal account).

## What it does

- Single-page festival experience — lineup, photos, map, and camping booking
- Live countdown to Saturday 1 August 2026
- Interactive lineup cards (tap to flip for band links)
- Photo gallery from the archive with lightbox
- Interactive map (OpenStreetMap / Leaflet) with directions
- Live price calculator and PayPal checkout for camping
- Automatic email to organisers after payment (FormSubmit — free)

## Pricing logic

| Item | Cost |
|------|------|
| Pitch (tent or campervan) | £12 per night |
| Included occupancy | Up to 4 people |
| Extra adults (17+) | £3 per person per night |
| Children (under 16) | Free |
| Printing & postage | £3 per booking |
| Maximum per pitch | 6 people |

## Setup (about 15 minutes)

### 1. PayPal

1. Create or sign in to a [PayPal Business account](https://www.paypal.com/uk/business) (free).
2. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/applications/live).
3. Create a **Live** app and copy the **Client ID**.
4. Open `js/config.js` and paste your **Client ID only** (never the Secret):

```javascript
window.KFD_CONFIG = {
  paypalClientId: 'YOUR_LIVE_CLIENT_ID_HERE',
  paypalEnvironment: 'production',
  // ... rest stays the same
};
```

5. Update band links in `js/bands.js` as you collect Instagram/Facebook URLs from acts.

**Test first:** Use a Sandbox Client ID from the Sandbox tab and set `paypalEnvironment: 'sandbox'`. Pay with [PayPal sandbox test accounts](https://developer.paypal.com/tools/sandbox/).

**Fees (UK, typical):** PayPal charges ~2.9% + 30p per card/PayPal payment. On a £27 booking that is roughly £1.08 — much less admin time than manual invoices.

### 2. FormSubmit email confirmation

The first time someone pays, FormSubmit sends a confirmation link to `KFDcamping@outlook.com`. Click it once to activate — after that, booking notifications arrive automatically.

### 3. Free hosting on GitHub Pages

```bash
git init
git add .
git commit -m "Add KFD camping booking page"
```

Create a new repository on GitHub, then:

```bash
git remote add origin https://github.com/YOUR-ORG/kfd-camping.git
git branch -M main
git push -u origin main
```

In the repo: **Settings → Pages → Build and deployment → Source: Deploy from branch → main / root**.

Your site will be live at `https://YOUR-ORG.github.io/kfd-camping/` within a few minutes.

**Custom domain (optional):** Add a `CNAME` file and configure DNS — still free on GitHub Pages.

### 4. Local preview

Any static file server works:

```bash
npx serve .
```

Open `http://localhost:3000` and test the form (PayPal sandbox recommended before going live).

**Tip:** Several archive photos are 2–3 MB each. For faster loads on mobile data, compress them with [Squoosh](https://squoosh.app) before pushing to GitHub — the gallery lazy-loads, but smaller files still help.

## File structure

```
index.html          Full festival site + camping booking
thank-you.html      Payment confirmation
css/styles.css      Styling
js/config.js        PayPal Client ID, dates, map coords
js/bands.js         Lineup with links (edit anytime)
js/gallery.js       Photo archive list
js/site.js          Countdown, lineup, gallery, map, nav
js/pricing.js       Price calculation
js/app.js           PayPal checkout + organiser email
images/             Poster + photo archive
```

## Alternatives

| Hosting | Cost | Notes |
|---------|------|-------|
| GitHub Pages | Free | Recommended — simple, reliable |
| Netlify | Free | Drag-and-drop deploy also works |
| Cloudflare Pages | Free | Good if you already use Cloudflare |

| Payments | Cost | Notes |
|----------|------|-------|
| PayPal Smart Buttons | ~2.9% + 30p | Already used by KFD; supports cards without a PayPal account |
| Stripe Payment Links | ~1.5% + 20p + 25p | Slightly cheaper but needs a backend or Stripe Payment Link per price |

PayPal is the best fit here because organisers already use it and it works entirely from a static page.

## Updating for future events

Edit `js/config.js` (deadline, email) and the dates in `index.html`. Rates are in `js/pricing.js` if prices change.

## Support

Camping enquiries: [KFDcamping@outlook.com](mailto:KFDcamping@outlook.com)
