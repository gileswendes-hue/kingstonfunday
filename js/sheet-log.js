(function () {
  'use strict';

  const PENDING_KEY = 'kfd-pending-sheet';
  const BACKUP_PREFIX = 'kfd-booking-';

  function sheetUrl() {
    return ((window.KFD_CONFIG || {}).bookingSheetUrl || '').trim();
  }

  function paymentRef(record) {
    return record.paypal_reference || record.transaction_id || '';
  }

  function backupRecord(ref, record) {
    if (!ref) return;
    try {
      sessionStorage.setItem(BACKUP_PREFIX + ref, JSON.stringify(record));
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ ref, record }));
    } catch (_) {}
  }

  function clearPending() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  }

  async function postRecord(url, record) {
    const body = new URLSearchParams({ payload: JSON.stringify(record) });
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      body,
    });
  }

  /** Silent POST to Google Sheet (requires bookingSheetUrl in config). */
  async function log(record) {
    const url = sheetUrl();
    if (!url) return false;

    const ref = paymentRef(record);
    backupRecord(ref, record);

    try {
      await postRecord(url, record);
      clearPending();
      return true;
    } catch (_) {
      return false;
    }
  }

  /** Retry from session backup (deduped server-side by PayPal ref). */
  async function replayForRef(ref) {
    const url = sheetUrl();
    if (!url || !ref) return;

    let record;
    try {
      const raw = sessionStorage.getItem(BACKUP_PREFIX + ref);
      if (!raw) return;
      record = JSON.parse(raw);
    } catch (_) {
      return;
    }

    try {
      await postRecord(url, record);
      clearPending();
    } catch (_) {}
  }

  async function flushPending(expectedRef) {
    if (!expectedRef) return;
    await replayForRef(expectedRef);
  }

  window.KFD_SHEET = { log, replayForRef, flushPending };
})();
