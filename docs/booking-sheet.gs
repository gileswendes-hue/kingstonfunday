/**
 * KFD booking + donation log — Google Apps Script
 *
 * SETUP (one time, ~5 minutes)
 * 1. Create a new Google Sheet.
 * 2. Add two tabs named exactly: Bookings | Donations
 * 3. Bookings row 1 headers (A→O):
 *    booked_at | paypal_reference | name | email | postal_address | pitches | nights |
 *    accommodation | adults | children | dogs | total_people | chargeable_adults | total_paid | breakdown
 * 4. Donations row 1 headers (A→C):
 *    donated_at | paypal_reference | amount
 * 5. Extensions → Apps Script → paste this entire file → Save
 * 6. Deploy → New deployment → Type: Web app
 *    Execute as: Me · Who has access: Anyone
 * 7. Copy the Web app URL (must end in /exec) into js/config.js → bookingSheetUrl
 * 8. Redeploy the site. Test: open the web app URL in a browser — you should see “KFD booking logger is running.”
 *
 * IMPORTANT: After any script change, Deploy → Manage deployments → Edit → New version → Deploy.
 * The site sends data as form field `payload` (most reliable from browsers).
 *
 * After changing this script you must Deploy → Manage deployments → Edit → New version → Deploy.
 */

function doGet() {
  return ContentService.createTextOutput('KFD booking logger is running.');
}

function doPost(e) {
  try {
    const data = parsePayload(e);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'donation') {
      appendDonation(ss, data);
    } else {
      appendBooking(ss, data);
    }

    return jsonOk();
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function parsePayload(e) {
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  throw new Error('Missing payload');
}

function appendBooking(ss, data) {
  const sheet = ss.getSheetByName('Bookings');
  if (!sheet) throw new Error('Missing "Bookings" tab');

  const ref = data.paypal_reference || '';
  if (ref && referenceExists(sheet, 2, ref)) return;

  sheet.appendRow([
    data.booked_at || new Date().toISOString(),
    ref,
    data.name || '',
    data.email || '',
    data.postal_address || '',
    data.pitches || '',
    data.nights || '',
    data.accommodation || '',
    data.adults || '',
    data.children || '',
    data.dogs || '',
    data.total_people || '',
    data.chargeable_adults || '',
    data.total_paid || '',
    data.breakdown || '',
  ]);
}

function appendDonation(ss, data) {
  const sheet = ss.getSheetByName('Donations');
  if (!sheet) throw new Error('Missing "Donations" tab');

  const ref = data.paypal_reference || '';
  if (ref && referenceExists(sheet, 2, ref)) return;

  sheet.appendRow([
    data.donated_at || new Date().toISOString(),
    ref,
    data.amount || '',
  ]);
}

function referenceExists(sheet, refColumn, ref) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const refs = sheet.getRange(2, refColumn, lastRow, refColumn).getValues().flat();
  return refs.indexOf(ref) !== -1;
}

function jsonOk() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(
    ContentService.MimeType.JSON
  );
}
