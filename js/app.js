(function () {
  'use strict';

  const config = window.KFD_CONFIG || {};
  const form = document.getElementById('booking-form');
  if (!form) return;

  const breakdownEl = document.getElementById('price-breakdown');
  const totalEl = document.getElementById('price-total');
  const occupancyError = document.getElementById('occupancy-error');
  const deadlineBanner = document.getElementById('deadline-banner');
  const configBanner = document.getElementById('config-banner');
  const paypalSection = document.getElementById('paypal-section');
  const paypalButtonsEl = document.getElementById('paypal-buttons');

  let latestQuote = null;
  let paypalRendered = false;

  function isBookingOpen() {
    if (!config.bookingDeadline) return true;
    const deadline = new Date(config.bookingDeadline + 'T23:59:59');
    return Date.now() <= deadline.getTime();
  }

  function readFormValues() {
    return {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      nights: form.nights.value,
      accommodation: form.querySelector('input[name="accommodation"]:checked')?.value || 'tent',
      adults: form.adults.value,
      children: form.children.value,
      dogs: form.dogs.value,
    };
  }

  function validateForm() {
    const values = readFormValues();
    const quote = calculateCampingPrice({
      nights: values.nights,
      adults: values.adults,
      children: values.children,
    });

    latestQuote = quote;

    const showOccupancyError = quote.totalPeople > RATES.maxPeople;
    occupancyError.hidden = !showOccupancyError;

    const formValid = form.checkValidity() && quote.valid;
    paypalSection.classList.toggle('is-disabled', !formValid || !isBookingOpen());

    return formValid;
  }

  function renderBreakdown() {
    const values = readFormValues();
    const quote = calculateCampingPrice({
      nights: values.nights,
      adults: values.adults,
      children: values.children,
    });

    latestQuote = quote;
    breakdownEl.innerHTML = quote.breakdown
      .map(
        (line) =>
          `<li><span>${line.label}</span><span>${formatGBP(line.amount)}</span></li>`
      )
      .join('');
    totalEl.textContent = formatGBP(quote.total);

    validateForm();
  }

  async function notifyOrganiser(values, quote, transactionId) {
    const email = config.organiserEmail;
    if (!email) return;

    const body = [
      'New KFD camping booking (paid)',
      '',
      `PayPal reference: ${transactionId}`,
      `Total paid: ${formatGBP(quote.total)}`,
      '',
      `Name: ${values.name}`,
      `Email: ${values.email}`,
      `Address: ${values.address}`,
      '',
      `Nights: ${values.nights}`,
      `Accommodation: ${values.accommodation}`,
      `Adults (17+): ${values.adults}`,
      `Children (under 16): ${values.children}`,
      `Dogs: ${values.dogs}`,
      '',
      'Price breakdown:',
      ...quote.breakdown.map((l) => `  ${l.label}: ${formatGBP(l.amount)}`),
    ].join('\n');

    await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        _subject: `KFD Camping Booking — ${values.name}`,
        _template: 'box',
        message: body,
        name: values.name,
        email: values.email,
        transaction_id: transactionId,
        total: formatGBP(quote.total),
      }),
    }).catch(() => {
      /* Email notification is best-effort; payment already captured */
    });
  }

  function loadPayPalSdk(clientId) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('paypal-sdk');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src =
        'https://www.paypal.com/sdk/js?client-id=' +
        encodeURIComponent(clientId) +
        '&currency=GBP&intent=capture&components=buttons';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function renderPayPalButtons() {
    if (paypalRendered || !window.paypal) return;
    paypalRendered = true;

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
      },

      onClick(_data, actions) {
        if (!validateForm() || !isBookingOpen()) {
          form.reportValidity();
          return actions.reject();
        }
        return actions.resolve();
      },

      createOrder() {
        if (!latestQuote || !validateForm()) {
          return Promise.reject(new Error('Please complete the form'));
        }

        const values = readFormValues();
        const description = [
          'KFD 2026 Camping',
          values.accommodation,
          `${values.nights} night(s)`,
          `${values.adults} adult(s), ${values.children} child(ren)`,
        ].join(' · ');

        return paypal.actions.order.create({
          purchase_units: [
            {
              description,
              amount: {
                currency_code: 'GBP',
                value: latestQuote.total.toFixed(2),
                breakdown: {
                  item_total: {
                    currency_code: 'GBP',
                    value: latestQuote.total.toFixed(2),
                  },
                },
              },
            },
          ],
          application_context: {
            shipping_preference: 'NO_SHIPPING',
          },
        });
      },

      onApprove(data) {
        return paypal.actions.order.capture(data.orderID).then(async (details) => {
          const transactionId =
            details.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
            data.orderID;

          const values = readFormValues();
          await notifyOrganiser(values, latestQuote, transactionId);

          const thankYou = config.thankYouUrl || 'thank-you.html';
          window.location.href = thankYou + '?ref=' + encodeURIComponent(transactionId);
        });
      },

      onError(err) {
        console.error('PayPal error:', err);
        alert('Payment could not be completed. Please try again or email KFDcamping@outlook.com.');
      },
    }).render('#paypal-buttons');
  }

  function init() {
    if (!isBookingOpen()) {
      deadlineBanner.hidden = false;
      form.querySelectorAll('input, select, textarea, button').forEach((el) => {
        el.disabled = true;
      });
      paypalSection.classList.add('is-disabled');
    }

    const clientId = (config.paypalClientId || '').trim();
    const hasPayPal = clientId && clientId !== 'YOUR_PAYPAL_CLIENT_ID';

    if (!hasPayPal) {
      configBanner.hidden = false;
      paypalSection.classList.add('is-disabled');
    }

    ['input', 'change'].forEach((event) => {
      form.addEventListener(event, renderBreakdown);
    });

    renderBreakdown();

    if (hasPayPal && isBookingOpen()) {
      loadPayPalSdk(clientId)
        .then(renderPayPalButtons)
        .catch(() => {
          configBanner.hidden = false;
          configBanner.textContent = 'Could not load PayPal. Check your Client ID and internet connection.';
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
