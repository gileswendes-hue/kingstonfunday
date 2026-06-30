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
  const paymentError = document.getElementById('payment-error');

  let latestQuote = null;
  let paypalRendered = false;

  function isBookingOpen() {
    if (!config.bookingDeadline) return true;
    const deadline = new Date(config.bookingDeadline + 'T23:59:59');
    return Date.now() <= deadline.getTime();
  }

  function showPaymentError(message) {
    if (!paymentError) return;
    paymentError.textContent = message;
    paymentError.hidden = false;
  }

  function clearPaymentError() {
    if (!paymentError) return;
    paymentError.hidden = true;
    paymentError.textContent = '';
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
        '&currency=GBP&intent=capture&components=buttons' +
        '&enable-funding=card&disable-funding=paylater,venmo';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function buildOrderPayload() {
    const values = readFormValues();
    const total = latestQuote.total.toFixed(2);

    return {
      purchase_units: [
        {
          description: 'KFD 2026 Camping pitch',
          custom_id: values.email.slice(0, 127),
          amount: {
            currency_code: 'GBP',
            value: total,
          },
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    };
  }

  function renderPayPalButtons() {
    if (paypalRendered || !window.paypal) return;
    paypalRendered = true;

    paypal
      .Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay',
        },

        onClick(_data, actions) {
          clearPaymentError();
          if (!validateForm() || !isBookingOpen()) {
            form.reportValidity();
            return actions.reject();
          }
          return actions.resolve();
        },

        createOrder(_data, actions) {
          if (!latestQuote || !validateForm()) {
            showPaymentError('Please complete all required fields before paying.');
            return Promise.reject(new Error('Form incomplete'));
          }

          return actions.order
            .create(buildOrderPayload())
            .catch((err) => {
              console.error('PayPal createOrder failed:', err);
              showPaymentError(
                'Could not start checkout. Check your details and try again, or email KFDcamping@outlook.com.'
              );
              throw err;
            });
        },

        onApprove(_data, actions) {
          return actions.order
            .capture()
            .then(async (details) => {
              const transactionId =
                details.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
                details.id;

              const values = readFormValues();
              await notifyOrganiser(values, latestQuote, transactionId);

              const thankYou = config.thankYouUrl || 'thank-you.html';
              window.location.href =
                thankYou + '?ref=' + encodeURIComponent(transactionId);
            })
            .catch((err) => {
              console.error('PayPal capture failed:', err);
              showPaymentError(
                'Payment could not be confirmed. If money left your account, email KFDcamping@outlook.com with your name and we will sort it.'
              );
            });
        },

        onCancel() {
          showPaymentError('Payment cancelled — you can try again when ready.');
        },

        onError(err) {
          console.error('PayPal error:', err);
          showPaymentError(
            'Payment could not be completed. Please try again or email KFDcamping@outlook.com.'
          );
        },
      })
      .render('#paypal-buttons')
      .catch((err) => {
        console.error('PayPal render failed:', err);
        showPaymentError(
          'PayPal could not load. Check that your Live Client ID is set in js/config.js and that Advanced Card Processing is enabled in your PayPal account.'
        );
      });
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
          configBanner.textContent =
            'Could not load PayPal. Check your Client ID and internet connection.';
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
