(function () {
  'use strict';

  const COOLDOWN_SEC = 5;
  const modal = document.getElementById('terms-modal');
  const acceptBtn = document.getElementById('terms-accept');
  const countdownEl = document.getElementById('terms-countdown');

  if (!modal || !acceptBtn) return;

  let accepted = false;
  let acceptedAt = null;
  let cooldownTimer = null;
  let pending = null;

  function clearCooldown() {
    if (cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }

  function startCooldown() {
    clearCooldown();
    acceptBtn.disabled = true;
    acceptBtn.textContent = 'I accept these terms';

    let remaining = COOLDOWN_SEC;
    countdownEl.textContent = `Please read the terms (${remaining}s)`;

    cooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCooldown();
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'I accept — continue to payment';
        countdownEl.textContent = '';
        acceptBtn.focus();
      } else {
        countdownEl.textContent = `Please read the terms (${remaining}s)`;
      }
    }, 1000);
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add('terms-open');
    startCooldown();
    acceptBtn.focus();
  }

  function closeModal() {
    clearCooldown();
    modal.hidden = true;
    document.body.classList.remove('terms-open');
    countdownEl.textContent = '';
  }

  function ensureAccepted() {
    if (accepted) return Promise.resolve();
    return new Promise((resolve, reject) => {
      pending = { resolve, reject };
      openModal();
    });
  }

  acceptBtn.addEventListener('click', () => {
    if (acceptBtn.disabled) return;
    accepted = true;
    acceptedAt = new Date().toISOString();
    closeModal();
    pending?.resolve();
    pending = null;
  });

  function getAcceptedAt() {
    return acceptedAt;
  }

  window.KFD_TERMS = { ensureAccepted, getAcceptedAt };
})();
