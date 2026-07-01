window.KFD_CONFIG = window.KFD_CONFIG || {
  paypalClientId: 'ASlcqV_FulbImg3novoOiWpvIH1Ce-TjjmvqGvuFI2Tn9wtK5Jbxr9XFf6YCTgO_Ga4YSbTXpaJ0WtGM',
  paypalEnvironment: 'production',
  paypalBusinessEmail: 'KFDcamping@outlook.com',

  organiserEmail: 'KFDcamping@outlook.com',
  formspreeEndpoint: 'https://formspree.io/f/mykqpaag',
  bookingDeadline: '2026-07-29',
  bookingSheetUrl: 'https://script.google.com/macros/s/AKfycbzFi5eFPAHmyIjLLYc2GqzIBxjpn7Owwv4NzF4JhOW69JjG62OfO4mbrf7R9fK_vA3V/exec',
  // Must match SHEET_SECRET in docs/booking-sheet.gs (stops random POSTs to your sheet URL).
  bookingSheetSecret: 'kfd_xR8mN2pQ7vLw4kH9sTf3jY6bC1dZ5aXe0',
  thankYouUrl: 'thank-you.html',

  eventDate: '2026-08-01T12:00:00',
  instagram: 'https://www.instagram.com/kfd_kingstonfunday/',

  map: {
    lat: 50.31335,
    lng: -3.91975,
    zoom: 18,
    label: 'Kingston Recreation Ground',
    address: 'TQ7 4QD · ///hedge.tidal.admits',
    postcode: 'TQ7 4QD',
    what3words: 'hedge.tidal.admits',
    w3wUrl: 'https://what3words.com/hedge.tidal.admits',
    directionsPostcodeUrl:
      'https://www.google.com/maps/dir/?api=1&destination=TQ7+4QD',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=Kingston+Recreation+Ground,+Kingston,+Devon',
  },
};
