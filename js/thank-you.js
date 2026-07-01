(function () {
  'use strict';

  const config = window.KFD_CONFIG || {};
  const params = new URLSearchParams(window.location.search);

  const ref = params.get('ref') || params.get('tx') || params.get('txn_id');
  const isDonation = params.get('donation') === '1';
  const donationAmount = params.get('amount');

  if (isDonation) {
    const lead = document.querySelector('.thank-you__lead');
    const extra = document.getElementById('thank-you-donation-extra');
    if (lead) {
      lead.textContent = donationAmount
        ? `Thank you for your £${donationAmount} donation!`
        : 'Thank you for your donation!';
    }
    if (extra) extra.hidden = false;
    document.querySelectorAll('.thank-you__camping-only').forEach((el) => {
      el.hidden = true;
    });
  }

  if (ref) {
    document.getElementById('reference-line').hidden = false;
    document.getElementById('paypal-ref').textContent = ref;
    window.KFD_SHEET?.replayForRef?.(ref);
    window.KFD_SHEET?.flushPending?.(ref);
    if (!isDonation) {
      window.KFD_NOTIFY?.replayCustomerConfirmation?.(ref);
    }
  }

  async function notifyLegacyReturn() {
    const status = (params.get('st') || params.get('payment_status') || '').toLowerCase();
    const isPaid = status === 'completed' || params.get('source') === 'legacy' && ref;

    if (!isPaid || !ref) return;

    const custom = params.get('cm') || params.get('custom') || '';
    const amount = params.get('amt') || params.get('mc_gross') || '';
    const email = window.KFD_NOTIFY?.endpoint?.();
    if (!email) return;

    const storageKey = 'kfd-notified-' + ref;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');

    await window.KFD_NOTIFY.send({
      name: custom.split('|')[0] || 'Guest',
      email: config.organiserEmail || 'bookings@kingstonfunday.co.uk',
      _subject: 'KFD Camping Booking (PayPal return) — ' + (custom.split('|')[0] || 'Guest'),
      message: [
        'Booking paid via PayPal website checkout',
        '',
        'Reference: ' + ref,
        'Amount: £' + amount,
        'Details: ' + custom.replace(/\|/g, '\n'),
      ].join('\n'),
    }).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', notifyLegacyReturn);
  } else {
    notifyLegacyReturn();
  }
})();
