(function () {
  'use strict';

  function config() {
    return window.KFD_CONFIG || {};
  }

  function endpoint() {
    return (config().formspreeEndpoint || 'https://formspree.io/f/mykqpaag').trim();
  }

  async function send(payload) {
    const url = endpoint();
    if (!url) return false;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  }

  async function sendDonation(transactionId, amount) {
    const formatted = typeof amount === 'number' ? '£' + amount.toFixed(2) : String(amount);

    return send({
      name: 'KFD Donation',
      email: config().organiserEmail || 'bookings@kingstonfunday.co.uk',
      _subject: `KFD Donation — ${formatted}`,
      message: ['New donation received', '', `Amount: ${formatted}`, `Reference: ${transactionId}`].join(
        '\n'
      ),
      paypal_reference: transactionId,
      booking_type: 'donation',
    });
  }

  window.KFD_NOTIFY = {
    endpoint,
    send,
    sendDonation,
  };
})();
