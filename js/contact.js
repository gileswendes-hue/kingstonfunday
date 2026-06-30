(function () {
  'use strict';

  const config = window.KFD_CONFIG || {};
  const modal = document.getElementById('contact-modal');
  const form = document.getElementById('contact-form');
  if (!modal || !form) return;

  const openIds = ['contact-open', 'contact-open-footer', 'contact-open-banner', 'contact-open-thanks'];
  const closeBtn = modal.querySelector('.contact-modal__close');
  const backdrop = modal.querySelector('.contact-modal__backdrop');
  const errorEl = document.getElementById('contact-error');
  const successEl = document.getElementById('contact-success');
  const submitBtn = form.querySelector('.contact-form__submit');

  let lastFocus = null;

  function endpoint() {
    return (config.formspreeEndpoint || 'https://formspree.io/f/mykqpaag').trim();
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function openModal(trigger) {
    lastFocus = trigger || document.activeElement;
    modal.hidden = false;
    document.body.classList.add('contact-open');
    showError('');
    if (successEl) successEl.hidden = true;
    form.hidden = false;
    submitBtn.disabled = false;
    closeBtn?.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('contact-open');
    showError('');
    if (lastFocus?.focus) lastFocus.focus();
  }

  openIds.forEach((id) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      openModal(e.currentTarget);
    });
  });

  closeBtn?.addEventListener('click', closeModal);
  backdrop?.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
      _subject: 'KFD website enquiry',
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(endpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Message could not be sent. Please try again.');
      }

      form.reset();
      form.hidden = true;
      if (successEl) successEl.hidden = false;
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again later.');
      submitBtn.disabled = false;
    } finally {
      submitBtn.textContent = 'Send message';
    }
  });
})();
