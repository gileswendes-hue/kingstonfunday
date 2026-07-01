(function () {
  'use strict';

  const config = window.KFD_CONFIG || {};
  const isSandbox = config.paypalEnvironment === 'sandbox';
  const PRESETS = [5, 10, 15];

  const modal = document.getElementById('donate-modal');
  if (!modal) return;

  const openBtn = document.getElementById('donate-open');
  const closeBtn = modal.querySelector('.donate-modal__close');
  const backdrop = modal.querySelector('.donate-modal__backdrop');
  const presetBtns = modal.querySelectorAll('[data-donate-amount]');
  const customInput = document.getElementById('donate-custom');
  const totalEl = document.getElementById('donate-total');
  const errorEl = document.getElementById('donate-error');
  const cardSlot = document.getElementById('donate-card-button');
  const unavailableEl = document.getElementById('donate-unavailable');

  let selectedAmount = null;
  let cardMounted = false;

  function formatGBP(amount) {
    return '£' + amount.toFixed(2);
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function getClientId() {
    const id = (config.paypalClientId || '').trim();
    return id && id !== 'YOUR_PAYPAL_CLIENT_ID' ? id : '';
  }

  function setSelectedAmount(amount) {
    selectedAmount = amount >= 1 ? Math.round(amount * 100) / 100 : null;
    presetBtns.forEach((btn) => {
      btn.classList.toggle('is-selected', Number(btn.dataset.donateAmount) === selectedAmount);
    });
    if (customInput && document.activeElement !== customInput) {
      customInput.value = selectedAmount && !PRESETS.includes(selectedAmount) ? selectedAmount : '';
    }
    if (totalEl) {
      totalEl.textContent = selectedAmount ? formatGBP(selectedAmount) : 'Choose an amount';
    }
    showError('');
    renderCardButton();
  }

  async function notifyDonation(transactionId, amount) {
    const record = {
      type: 'donation',
      paypal_reference: transactionId,
      amount: formatGBP(amount),
      donated_at: new Date().toISOString(),
    };

    const tasks = [window.KFD_SHEET.log(record)];

    const email = config.organiserEmail;
    if (email) {
      tasks.push(
        fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            _subject: `KFD Donation — ${formatGBP(amount)}`,
            _template: 'box',
            message: [
              'New donation received',
              '',
              `Amount: ${formatGBP(amount)}`,
              `Reference: ${transactionId}`,
            ].join('\n'),
            transaction_id: transactionId,
            amount: formatGBP(amount),
          }),
        }).catch(() => {})
      );
    }

    await Promise.all(tasks);
  }

  function renderCardButton() {
    if (!cardSlot) return;
    cardSlot.innerHTML = '';
    cardMounted = false;

    if (!selectedAmount || selectedAmount < 1) return;

    const clientId = getClientId();
    if (!clientId || !window.paypal?.Buttons) return;

    cardMounted = true;
    const amount = selectedAmount;

    window.paypal
      .Buttons({
        fundingSource: paypal.FUNDING.CARD,
        style: {
          layout: 'vertical',
          color: 'black',
          shape: 'rect',
          label: 'pay',
          height: 45,
        },
        createOrder(_data, actions) {
          return actions.order.create({
            purchase_units: [
              {
                description: 'KFD Donation',
                amount: {
                  currency_code: 'GBP',
                  value: amount.toFixed(2),
                },
              },
            ],
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
            },
          });
        },
        onApprove(_data, actions) {
          return actions.order
            .capture()
            .then((details) => {
              const capture = details.purchase_units?.[0]?.payments?.captures?.[0];
              const transactionId = capture?.id || details.id;

              if (capture?.status && capture.status !== 'COMPLETED') {
                throw new Error('Payment was not completed.');
              }

              notifyDonation(transactionId, amount).finally(() => {
                closeModal();
                const thankYou = config.thankYouUrl || 'thank-you.html';
                window.location.href =
                  thankYou +
                  '?ref=' +
                  encodeURIComponent(transactionId) +
                  '&donation=1&amount=' +
                  encodeURIComponent(amount.toFixed(2));
              });
            })
            .catch((err) => {
              showError(
                window.KFD_PAYPAL.parseError(err) ||
                  'Payment could not be confirmed. Please try again.'
              );
            });
        },
        onCancel() {
          showError('Payment cancelled — select an amount and try again.');
        },
        onError(err) {
          showError(
            window.KFD_PAYPAL.parseError(err) ||
              'Payment could not be completed. Please try again.'
          );
        },
      })
      .render('#donate-card-button')
      .catch(() => {
        showError('Card checkout could not load. Please try again later.');
      });
  }

  async function ensurePayPal() {
    const clientId = getClientId();
    if (!clientId) {
      if (unavailableEl) unavailableEl.hidden = false;
      if (cardSlot) cardSlot.hidden = true;
      return false;
    }
    if (unavailableEl) unavailableEl.hidden = true;
    if (cardSlot) cardSlot.hidden = false;

    try {
      await window.KFD_PAYPAL.loadSdk(clientId, isSandbox);
      return true;
    } catch {
      if (unavailableEl) unavailableEl.hidden = false;
      showError('Could not load payment system. Please try again later.');
      return false;
    }
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add('donate-open');
    modal.scrollTop = 0;
    closeBtn?.focus();
    ensurePayPal().then((ok) => {
      if (ok && selectedAmount) renderCardButton();
    });
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('donate-open');
    showError('');
    openBtn?.focus();
  }

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSelectedAmount(Number(btn.dataset.donateAmount));
    });
  });

  customInput?.addEventListener('change', () => {
    const val = parseFloat(customInput.value);
    if (val >= 1 && val <= 500) setSelectedAmount(val);
    else if (customInput.value === '') setSelectedAmount(null);
    else showError('Enter an amount between £1 and £500.');
  });

  customInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      customInput.dispatchEvent(new Event('change'));
    }
  });

  openBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  setSelectedAmount(null);
})();
