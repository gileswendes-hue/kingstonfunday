(function () {
  'use strict';

  const PENDING_KEY = 'kfd-pending-sheet';

  function sheetUrl() {
    return ((window.KFD_CONFIG || {}).bookingSheetUrl || '').trim();
  }

  function loggedKey(ref) {
    return 'kfd-sheet-logged-' + ref;
  }

  function paymentRef(record) {
    return record.paypal_reference || record.transaction_id || '';
  }

  function stash(ref, record) {
    if (!ref) return;
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ref, record }));
    } catch (_) {}
  }

  function clearStash() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  }

  function markLogged(ref) {
    if (!ref) return;
    clearStash();
    try {
      sessionStorage.setItem(loggedKey(ref), '1');
    } catch (_) {}
  }

  function isLogged(ref) {
    if (!ref) return false;
    try {
      return sessionStorage.getItem(loggedKey(ref)) === '1';
    } catch (_) {
      return false;
    }
  }

  async function postRecord(url, record) {
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(record),
    });
  }

  /** Silent POST to Google Sheet (requires bookingSheetUrl in config). */
  async function log(record) {
    const url = sheetUrl();
    if (!url) return false;

    const ref = paymentRef(record);
    if (ref && isLogged(ref)) return true;

    stash(ref, record);

    try {
      await postRecord(url, record);
      markLogged(ref);
      return true;
    } catch (_) {
      return false;
    }
  }

  /** Retry a pending row if the pre-redirect request was cancelled. */
  async function flushPending(expectedRef) {
    const url = sheetUrl();
    if (!url) return;

    let pending;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      pending = JSON.parse(raw);
    } catch (_) {
      return;
    }

    const ref = pending.ref || paymentRef(pending.record || {});
    if (!ref) return;
    if (expectedRef && ref !== expectedRef) return;
    if (isLogged(ref)) {
      clearStash();
      return;
    }

    try {
      await postRecord(url, pending.record);
      markLogged(ref);
    } catch (_) {}
  }

  window.KFD_SHEET = { log, flushPending };
})();
