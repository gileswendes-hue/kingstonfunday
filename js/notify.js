(function () {
  'use strict';

  function config() {
    return window.KFD_CONFIG || {};
  }

  function endpoint() {
    return (config().formspreeEndpoint || 'https://formspree.io/f/mykqpaag').trim();
  }

  function formsubmitEndpoint() {
    const email = (config().organiserEmail || '').trim();
    return email ? 'https://formsubmit.co/ajax/' + encodeURIComponent(email) : '';
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

  function customerConfirmationMessage(record) {
    const firstName = (record.name || '').split(' ')[0] || 'there';
    const pitches = record.pitches || '1';
    const accommodation =
      record.accommodation === 'campervan' ? 'Campervan / motorhome' : 'Tent';

    return [
      'Hi ' + firstName + ',',
      '',
      'Thank you for booking camping at Kingston Fun Day 2026. Your payment was successful.',
      '',
      'We will post your camping passes and wristbands to:',
      record.postal_address || '',
      record.postcode || '',
      '',
      'Booking summary',
      '• ' + pitches + ' pitch(es), ' + (record.nights || '') + ' night(s)',
      '• ' + accommodation,
      '• ' + (record.adults || '0') + ' adults, ' + (record.children || '0') + ' children, ' +
        (record.dogs || '0') + ' dogs',
      '• Total paid: ' + (record.total_paid || ''),
      '• Payment reference: ' + (record.paypal_reference || ''),
      '',
      'Campsite opens 4:00pm Friday 31 July 2026.',
      'Depart by 11:00am Sunday 2 August 2026.',
      '',
      'Questions? Contact us via kingstonfunday.co.uk',
      '',
      'Kingston Fun Day',
    ].join('\n');
  }

  /** Sends booker confirmation via FormSubmit autoresponse (backup to Apps Script email). */
  async function sendCustomerConfirmation(record) {
    const url = formsubmitEndpoint();
    if (!url || !record?.email || !record?.name) return false;

    const message = customerConfirmationMessage(record);
    const notifiedKey = 'kfd-customer-email-' + (record.paypal_reference || '');

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          _subject: 'Your KFD 2026 camping booking — confirmed',
          _template: 'box',
          _captcha: 'false',
          email: record.email,
          name: record.name,
          _autoresponse: message,
          message: message,
        }),
      });

      if (res.ok && record.paypal_reference) {
        sessionStorage.setItem(notifiedKey, '1');
      }

      return res.ok;
    } catch (_) {
      return false;
    }
  }

  async function replayCustomerConfirmation(ref) {
    if (!ref || sessionStorage.getItem('kfd-customer-email-' + ref)) return true;

    let record;
    try {
      const raw = sessionStorage.getItem('kfd-booking-' + ref);
      if (!raw) return false;
      record = JSON.parse(raw);
    } catch (_) {
      return false;
    }

    return sendCustomerConfirmation(record);
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
    sendCustomerConfirmation,
    replayCustomerConfirmation,
    sendDonation,
  };
})();
