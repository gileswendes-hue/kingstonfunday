window.KFD_PAYPAL = (function () {
  'use strict';

  function getSdkBaseUrl(isSandbox) {
    return isSandbox
      ? 'https://www.sandbox.paypal.com/sdk/js'
      : 'https://www.paypal.com/sdk/js';
  }

  function loadSdk(clientId, isSandbox) {
    return new Promise((resolve, reject) => {
      if (window.paypal?.Buttons) {
        resolve();
        return;
      }

      const existing = document.getElementById('paypal-sdk');
      if (existing) existing.remove();

      const script = document.createElement('script');
      script.id = 'paypal-sdk';
      script.src =
        getSdkBaseUrl(isSandbox) +
        '?client-id=' +
        encodeURIComponent(clientId) +
        '&currency=GBP&intent=capture&components=buttons' +
        '&enable-funding=card&disable-funding=paylater,venmo';
      script.onload = () => {
        if (window.paypal?.Buttons) resolve();
        else reject(new Error('PayPal SDK loaded but paypal object is missing'));
      };
      script.onerror = () => reject(new Error('PayPal SDK script failed to load'));
      document.body.appendChild(script);
    });
  }

  function parseError(err) {
    if (!err) return '';
    if (typeof err === 'string') return err;
    if (Array.isArray(err.details) && err.details.length) {
      return err.details
        .map((d) => d.description || d.issue)
        .filter(Boolean)
        .join('. ');
    }
    return err.message || err.errMsg || '';
  }

  return { getSdkBaseUrl, loadSdk, parseError };
})();
