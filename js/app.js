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
  let buttonsMounted = false;

  const isSandbox = config.paypalEnvironment === 'sandbox';

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
    const firstName = form.firstName.value.trim();
    const surname = form.surname.value.trim();

    return {
      firstName,
      surname,
      name: [firstName, surname].filter(Boolean).join(' '),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      nights: form.nights.value,
      accommodation: form.querySelector('input[name="accommodation"]:checked')?.value || 'tent',
      adults: form.adults.value,
      children: form.children.value,
      dogs: form.dogs.value,
    };
  }

  function buildPayer(values) {
    const addressLine = values.address.split('\n').map((l) => l.trim()).filter(Boolean)[0] || values.address;

    return {
      email_address: values.email,
      name: {
        given_name: values.firstName.slice(0, 140),
        surname: values.surname.slice(0, 140),
      },
      address: {
        address_line_1: addressLine.slice(0, 300),
        country_code: 'GB',
      },
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
    }).catch(() => {});
  }

  function getSdkBaseUrl() {
    return isSandbox
      ? 'https://www.sandbox.paypal.com/sdk/js'
      : 'https://www.paypal.com/sdk/js';
  }

  function loadPayPalSdk(clientId) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById('paypal-sdk');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src =
        getSdkBaseUrl() +
        '?client-id=' +
        encodeURIComponent(clientId) +
        '&currency=GBP&intent=capture&components=buttons' +
        '&enable-funding=card&disable-funding=paypal,paylater,venmo';
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  function buildOrderPayload() {
    const values = readFormValues();
    const total = latestQuote.total.toFixed(2);
    const summary = [
      values.name,
      `${values.nights}n ${values.accommodation}`,
      `${values.adults}a/${values.children}c`,
    ].join(' · ');

    return {
      intent: 'CAPTURE',
      payer: buildPayer(values),
      purchase_units: [
        {
          description: 'KFD 2026 camping pitch',
          invoice_id: 'KFD-' + Date.now().toString(36).toUpperCase(),
          custom_id: summary.slice(0, 127),
          amount: {
            currency_code: 'GBP',
            value: total,
          },
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };
  }

  function parsePayPalError(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    return err.message || err.errMsg || err.details?.[0]?.description || '';
  }

  function sharedCreateOrder(_data, actions) {
    clearPaymentError();

    if (!latestQuote || !validateForm()) {
      showPaymentError('Please complete all required fields before paying.');
      return Promise.reject(new Error('Form incomplete'));
    }

    return actions.order.create(buildOrderPayload()).catch((err) => {
      console.error('PayPal createOrder failed:', err);
      const detail = parsePayPalError(err);
      showPaymentError(
        detail
          ? `Checkout error: ${detail}`
          : 'Could not start checkout. Please try again or email KFDcamping@outlook.com.'
      );
      throw err;
    });
  }

  function sharedOnApprove(_data, actions) {
    return actions.order
      .capture()
      .then(async (details) => {
        const transactionId =
          details.purchase_units?.[0]?.payments?.captures?.[0]?.id || details.id;

        const values = readFormValues();
        await notifyOrganiser(values, latestQuote, transactionId);

        const thankYou = config.thankYouUrl || 'thank-you.html';
        window.location.href = thankYou + '?ref=' + encodeURIComponent(transactionId);
      })
      .catch((err) => {
        console.error('PayPal capture failed:', err);
        const detail = parsePayPalError(err);
        showPaymentError(
          detail
            ? `Payment failed: ${detail}`
            : 'Payment could not be confirmed. If money left your account, email KFDcamping@outlook.com.'
        );
      });
  }

  function renderCardButton() {
    if (buttonsMounted || !window.paypal) return;
    buttonsMounted = true;

    paypal
      .Buttons({
        fundingSource: paypal.FUNDING.CARD,
        style: {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'pay',
          height: 45,
        },
        createOrder: sharedCreateOrder,
        onApprove: sharedOnApprove,
        onCancel() {
          showPaymentError('Payment cancelled — you can try again when ready.');
        },
        onError(err) {
          console.error('Card payment error:', err);
          const detail = parsePayPalError(err);
          showPaymentError(
            detail
              ? `Payment error: ${detail}`
              : 'Payment could not be completed. Please try again or email KFDcamping@outlook.com.'
          );
        },
      })
      .render('#card-button')
      .catch((err) => {
        console.error('Card button render failed:', err);
        showPaymentError(
          'Card checkout could not load. Check your Client ID in config.js and that card payments are enabled on your PayPal account.'
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
    } else if (isSandbox) {
      configBanner.hidden = false;
      configBanner.textContent =
        'PayPal is in SANDBOX mode — use sandbox test accounts only. Set paypalEnvironment to "production" for real payments.';
    }

    ['input', 'change'].forEach((event) => {
      form.addEventListener(event, renderBreakdown);
    });

    renderBreakdown();

    if (hasPayPal && isBookingOpen()) {
      loadPayPalSdk(clientId)
        .then(renderCardButton)
        .catch(() => {
          configBanner.hidden = false;
          configBanner.textContent =
            'Could not load PayPal SDK. Check Client ID, environment setting, and internet connection.';
        });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
