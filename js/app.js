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



  function getQuoteFromForm() {

    const values = readFormValues();

    return calculateCampingPrice({

      nights: values.nights,

      adults: values.adults,

      children: values.children,

      dogs: values.dogs,

    });

  }



  function validateForm() {

    const values = readFormValues();

    const quote = getQuoteFromForm();

    latestQuote = quote;



    const showOccupancyError = !quote.valid;

    if (occupancyError) {

      occupancyError.hidden = !showOccupancyError;

      if (showOccupancyError) {

        if (Number(values.dogs) > RATES.maxDogs) {

          occupancyError.textContent = `Maximum ${RATES.maxDogs} dogs per booking.`;

        } else if (Number(values.adults) < 1) {

          occupancyError.textContent = 'At least one adult (17+) is required.';

        } else {

          occupancyError.textContent = 'Please check your pitch details.';

        }

      }

    }



    const formValid = form.checkValidity() && quote.valid;

    paypalSection.classList.toggle('is-disabled', !formValid || !isBookingOpen());



    return formValid;

  }



  function renderBreakdown() {

    const quote = getQuoteFromForm();

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



  function buildBookingRecord(values, quote, transactionId) {

    return {

      type: 'camping_booking',

      paypal_reference: transactionId,

      total_paid: formatGBP(quote.total),

      name: values.name,

      email: values.email,

      postal_address: values.address,

      nights: values.nights,

      pitches: String(quote.pitchCount),

      accommodation: values.accommodation,

      adults: values.adults,

      children: values.children,

      dogs: values.dogs,

      total_people: String(quote.totalPeople),

      chargeable_adults: String(quote.chargeableAdults),

      breakdown: quote.breakdown.map((l) => `${l.label}: ${formatGBP(l.amount)}`).join(' | '),

      booked_at: new Date().toISOString(),

    };

  }



  async function notifyOrganiser(values, quote, transactionId) {

    const email = config.organiserEmail;

    if (!email) return;



    const record = buildBookingRecord(values, quote, transactionId);

    const body = [

      'New KFD camping booking (paid)',

      '',

      `PayPal reference: ${transactionId}`,

      `Total paid: ${formatGBP(quote.total)}`,

      '',

      `Name: ${values.name}`,

      `Email: ${values.email}`,

      `Postal address: ${values.address}`,

      '',

      `Pitches: ${quote.pitchCount}`,

      `Nights: ${values.nights}`,

      `Accommodation: ${values.accommodation}`,

      `Adults (17+): ${values.adults}`,

      `Children (under 16): ${values.children}`,

      `Dogs: ${values.dogs}`,

      `Total people: ${quote.totalPeople}`,

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

        _subject: `KFD Camping — ${values.name} (${quote.pitchCount} pitch${quote.pitchCount > 1 ? 'es' : ''})`,

        _template: 'table',

        message: body,

        ...record,

      }),

    }).catch(() => {});



    const sheetUrl = (config.bookingSheetUrl || '').trim();

    if (sheetUrl) {

      await fetch(sheetUrl, {

        method: 'POST',

        mode: 'no-cors',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(record),

      }).catch(() => {});

    }

  }



  function loadPayPalSdk(clientId) {

    return window.KFD_PAYPAL.loadSdk(clientId, isSandbox);

  }



  function buildOrderPayload() {

    const values = readFormValues();

    const total = latestQuote.total.toFixed(2);

    const summary = [

      values.name,

      `${latestQuote.pitchCount}p ${values.nights}n ${values.accommodation}`,

      `${values.adults}a/${values.children}c/${values.dogs}d`,

    ].join(' · ');



    return {

      purchase_units: [

        {

          description: `KFD 2026 camping — ${latestQuote.pitchCount} pitch${latestQuote.pitchCount > 1 ? 'es' : ''}`,

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

    return window.KFD_PAYPAL?.parseError(err) || '';

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

          : 'Could not start checkout. Please try again or contact us.'

      );

      throw err;

    });

  }



  function sharedOnApprove(_data, actions) {

    return actions.order

      .capture()

      .then((details) => {

        const capture = details.purchase_units?.[0]?.payments?.captures?.[0];

        const transactionId = capture?.id || details.id;



        if (capture?.status && capture.status !== 'COMPLETED') {

          throw new Error('Payment was not completed (status: ' + capture.status + ').');

        }



        const values = readFormValues();
        const thankYou = config.thankYouUrl || 'thank-you.html';

        return notifyOrganiser(values, latestQuote, transactionId).finally(() => {
          window.location.href = thankYou + '?ref=' + encodeURIComponent(transactionId);
        });

      })

      .catch((err) => {

        console.error('PayPal capture failed:', err);

        const detail = parsePayPalError(err);

        showPaymentError(

          detail

            ? `Payment failed: ${detail}`

            : 'Payment could not be confirmed. If money left your account, please contact us.'

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

              : 'Payment could not be completed. Please try again or contact us.'

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

        if (!el.closest('.pitch-gauges')) el.disabled = true;

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

        .catch((err) => {

          console.error('PayPal SDK load failed:', err);

          configBanner.hidden = false;

          configBanner.textContent =

            'Card checkout could not load. Check your Live Client ID in js/config.js matches paypalEnvironment: "production".';

        });

    }

  }



  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', init);

  } else {

    init();

  }

})();

