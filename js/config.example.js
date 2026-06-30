/**
 * Copy to config.js and fill in your values.
 * IMPORTANT: Only the PayPal Client ID belongs here.
 * The Secret must NEVER be added to this file — GitHub Pages is public
 * and the Secret would let anyone capture payments on your account.
 */
window.KFD_CONFIG = {
  paypalClientId: 'YOUR_PAYPAL_CLIENT_ID',
  paypalEnvironment: 'sandbox',

  organiserEmail: 'KFDcamping@outlook.com',
  bookingDeadline: '2026-07-29',
  thankYouUrl: 'thank-you.html',

  eventDate: '2026-08-01T12:00:00',
  instagram: 'https://www.instagram.com/kfd_kingstonfunday/',

  map: {
    lat: 50.31472,
    lng: -3.91485,
    zoom: 16,
    label: 'Kingston Recreation Ground',
    address: 'Kingston, South Devon TQ7 · Knightsbridge',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=Kingston+Recreation+Ground,+Kingston,+Devon',
  },
};
